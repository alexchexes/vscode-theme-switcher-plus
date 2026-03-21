import * as vscode from 'vscode';

const WORKBENCH_KEY = 'workbench';
const COLOR_THEME_KEY = 'colorTheme';
const WORKBENCH_THEME_KEY = `${WORKBENCH_KEY}.${COLOR_THEME_KEY}`;
const EXTENSION_PREFIX = 'themeSwitcher';

interface ContributedTheme {
  id?: string;
  label?: string;
  uiTheme?: string;
}

let allInstalledThemes: ContributedTheme[] = [];
let currentIndexInAllInstalledThemes = -1;

let selectedThemes: string[] = [];
let currentSelectedThemeIndex = -1;

export function activate(context: vscode.ExtensionContext): void {
  refreshState();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration(EXTENSION_PREFIX) ||
        event.affectsConfiguration(WORKBENCH_THEME_KEY)
      ) {
        refreshState();
      }
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.nextSelectedTheme`, async () => {
      await setNextSelectedTheme();
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.previousSelectedTheme`, async () => {
      await setPreviousSelectedTheme();
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.nextTheme`, async () => {
      await setNextTheme();
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.previousTheme`, async () => {
      await setPreviousTheme();
    }),
  );
}

function refreshState(): void {
  allInstalledThemes = loadAllThemes();
  selectedThemes = loadConfiguredThemes();

  const currentThemeName = getCurrentThemeName();
  currentIndexInAllInstalledThemes = allInstalledThemes
    .map((theme) => resolveThemeName(theme))
    .findIndex((themeName) => themeName === currentThemeName);
  currentSelectedThemeIndex = selectedThemes.indexOf(currentThemeName);
}

function loadAllThemes(): ContributedTheme[] {
  const installedThemes = vscode.extensions.all.flatMap((extension) => {
    const contributes = extension.packageJSON.contributes as { themes?: ContributedTheme[] } | undefined;
    return contributes?.themes ?? [];
  });

  const lightThemes = installedThemes.filter((theme) => theme.uiTheme === 'vs');
  const darkThemes = installedThemes.filter((theme) => theme.uiTheme === 'vs-dark');
  const remainingThemes = installedThemes.filter(
    (theme) => theme.uiTheme !== 'vs' && theme.uiTheme !== 'vs-dark',
  );

  const seenThemes = new Set<string>();

  return [...lightThemes, ...darkThemes, ...remainingThemes].filter((theme) => {
    const themeName = resolveThemeName(theme);
    if (!themeName || seenThemes.has(themeName)) {
      return false;
    }

    seenThemes.add(themeName);
    return true;
  });
}

function loadConfiguredThemes(): string[] {
  const extensionConfig = vscode.workspace.getConfiguration(EXTENSION_PREFIX);
  const configuredThemes = extensionConfig.get<string[]>('themes', []);

  if (configuredThemes.length > 0) {
    return configuredThemes.map((themeName) => themeName.trim()).filter(Boolean);
  }

  const legacyThemesList = extensionConfig.get<string>('themesList', '');
  return legacyThemesList
    .split(',')
    .map((themeName) => themeName.trim())
    .filter(Boolean);
}

function getCurrentThemeName(): string {
  return vscode.workspace.getConfiguration().get<string>(WORKBENCH_THEME_KEY) ?? '';
}

function resolveThemeName(theme: ContributedTheme): string {
  return theme.id ?? theme.label ?? '';
}

async function setNextTheme(): Promise<void> {
  refreshState();
  currentIndexInAllInstalledThemes += 1;
  await setThemeByIndex();
}

async function setPreviousTheme(): Promise<void> {
  refreshState();
  currentIndexInAllInstalledThemes -= 1;
  await setThemeByIndex();
}

async function setNextSelectedTheme(): Promise<void> {
  refreshState();
  currentSelectedThemeIndex += 1;
  await setSelectedThemeByIndex();
}

async function setPreviousSelectedTheme(): Promise<void> {
  refreshState();
  currentSelectedThemeIndex -= 1;
  await setSelectedThemeByIndex();
}

async function setThemeByIndex(): Promise<void> {
  if (allInstalledThemes.length === 0) {
    void vscode.window.showWarningMessage('No installed themes were found.');
    return;
  }

  currentIndexInAllInstalledThemes = normalizeIndex(
    currentIndexInAllInstalledThemes,
    allInstalledThemes.length,
  );

  const themeName = resolveThemeName(allInstalledThemes[currentIndexInAllInstalledThemes]);
  await setThemeByName(themeName);
}

async function setSelectedThemeByIndex(): Promise<void> {
  if (selectedThemes.length === 0) {
    void vscode.window.showWarningMessage(
      'Configure themeSwitcher.themes to use the selected-theme commands.',
    );
    return;
  }

  currentSelectedThemeIndex = normalizeIndex(currentSelectedThemeIndex, selectedThemes.length);

  await setThemeByName(selectedThemes[currentSelectedThemeIndex]);
}

function normalizeIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

async function setThemeByName(themeName: string): Promise<void> {
  if (!themeName) {
    void vscode.window.showWarningMessage('The selected theme could not be resolved.');
    return;
  }

  await vscode.workspace
    .getConfiguration()
    .update(WORKBENCH_THEME_KEY, themeName, getConfigurationTarget());

  vscode.window.setStatusBarMessage(`Theme Switcher+: ${themeName}`, 2500);
  refreshState();
}

function getConfigurationTarget(): vscode.ConfigurationTarget {
  const config = vscode.workspace.getConfiguration(WORKBENCH_KEY);
  const info = config.inspect<string>(COLOR_THEME_KEY);

  if (info?.workspaceValue !== undefined) {
    return vscode.ConfigurationTarget.Workspace;
  }

  if (info?.globalValue !== undefined) {
    return vscode.ConfigurationTarget.Global;
  }

  if (vscode.workspace.workspaceFolders?.length) {
    return vscode.ConfigurationTarget.Workspace;
  }

  return vscode.ConfigurationTarget.Global;
}
