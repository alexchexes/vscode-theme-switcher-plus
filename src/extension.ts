import * as vscode from 'vscode';

const WORKBENCH_KEY = 'workbench';
const COLOR_THEME_KEY = 'colorTheme';
const WORKBENCH_THEME_KEY = `${WORKBENCH_KEY}.${COLOR_THEME_KEY}`;
const EXTENSION_PREFIX = 'themeSwitcher';
const PRIMARY_THEMES_KEY = 'primaryThemes';
const SECONDARY_THEMES_KEY = 'secondaryThemes';
const LEGACY_THEMES_KEY = 'themes';
const LEGACY_THEMES_LIST_KEY = 'themesList';

type ThemeSource = 'installed' | 'primary' | 'secondary' | 'selected';
type ThemeTarget = 'auto' | 'global' | 'workspace';
type CycleDirection = 'next' | 'previous';

interface ContributedTheme {
  id?: string;
  label?: string;
  uiTheme?: string;
}

interface ThemeDescriptor {
  name: string;
  aliases: Set<string>;
}

interface CycleThemesArgs {
  source?: ThemeSource;
  direction?: CycleDirection;
  target?: ThemeTarget;
}

interface SetThemeArgs {
  theme?: string;
  target?: ThemeTarget;
}

interface CycleCandidateResult {
  resolvedThemeName?: string;
  skippedThemes: string[];
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.nextSelectedTheme`, async () => {
      await cycleThemesCommand({ source: 'primary', direction: 'next', target: 'auto' });
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.previousSelectedTheme`, async () => {
      await cycleThemesCommand({ source: 'primary', direction: 'previous', target: 'auto' });
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.nextTheme`, async () => {
      await cycleThemesCommand({ source: 'installed', direction: 'next', target: 'auto' });
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.previousTheme`, async () => {
      await cycleThemesCommand({ source: 'installed', direction: 'previous', target: 'auto' });
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.nextSecondaryTheme`, async () => {
      await cycleThemesCommand({ source: 'secondary', direction: 'next', target: 'auto' });
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.previousSecondaryTheme`, async () => {
      await cycleThemesCommand({ source: 'secondary', direction: 'previous', target: 'auto' });
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.cycleThemes`, async (args?: unknown) => {
      await cycleThemesCommand(args);
    }),
    vscode.commands.registerCommand(`${EXTENSION_PREFIX}.setTheme`, async (args?: unknown) => {
      await setThemeCommand(args);
    }),
  );
}

function getInstalledThemes(): ThemeDescriptor[] {
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
    const themeName = resolveContributedThemeName(theme);
    if (!themeName || seenThemes.has(themeName)) {
      return false;
    }

    seenThemes.add(themeName);
    return true;
  }).map((theme) => {
    const themeName = resolveContributedThemeName(theme);

    return {
      name: themeName,
      aliases: new Set([themeName, theme.id, theme.label].filter(isString)),
    };
  });
}

function normalizeIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function resolveContributedThemeName(theme: ContributedTheme): string {
  return theme.id ?? theme.label ?? '';
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeTarget(target: unknown): ThemeTarget {
  if (target === 'global' || target === 'workspace' || target === 'auto') {
    return target;
  }

  return 'auto';
}

function normalizeSource(source: unknown): ThemeSource {
  if (source === 'primary' || source === 'secondary' || source === 'installed') {
    return source;
  }

  if (source === 'selected') {
    return 'primary';
  }

  return 'installed';
}

function normalizeDirection(direction: unknown): CycleDirection {
  if (direction === 'previous') {
    return 'previous';
  }

  return 'next';
}

function parseCycleThemesArgs(args: unknown): Required<CycleThemesArgs> {
  if (!isRecord(args)) {
    return {
      source: 'installed',
      direction: 'next',
      target: 'auto',
    };
  }

  return {
    source: normalizeSource(args.source),
    direction: normalizeDirection(args.direction),
    target: normalizeTarget(args.target),
  };
}

function parseSetThemeArgs(args: unknown): SetThemeArgs {
  if (isString(args)) {
    return {
      theme: args.trim(),
      target: 'auto',
    };
  }

  if (!isRecord(args)) {
    return {
      target: 'auto',
    };
  }

  return {
    theme: isString(args.theme) ? args.theme.trim() : undefined,
    target: normalizeTarget(args.target),
  };
}

function getExtensionConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(EXTENSION_PREFIX);
}

function getExplicitStringArraySetting(
  config: vscode.WorkspaceConfiguration,
  key: string,
): string[] | undefined {
  const inspected = config.inspect<readonly string[]>(key);
  const explicitValue =
    inspected?.workspaceFolderValue ?? inspected?.workspaceValue ?? inspected?.globalValue;

  if (explicitValue === undefined) {
    return undefined;
  }

  return [...explicitValue];
}

function getExplicitStringSetting(
  config: vscode.WorkspaceConfiguration,
  key: string,
): string | undefined {
  const inspected = config.inspect<string>(key);
  const explicitValue =
    inspected?.workspaceFolderValue ?? inspected?.workspaceValue ?? inspected?.globalValue;

  if (explicitValue === undefined) {
    return undefined;
  }

  return explicitValue;
}

function resolveRequestedThemeName(
  requestedThemeName: string,
  installedThemes: ThemeDescriptor[],
): string | undefined {
  const normalizedThemeName = requestedThemeName.trim();
  if (!normalizedThemeName) {
    return undefined;
  }

  const installedTheme = installedThemes.find((theme) => theme.aliases.has(normalizedThemeName));
  return installedTheme?.name;
}

function normalizeThemeNames(
  themeNames: readonly string[],
  installedThemes: ThemeDescriptor[],
): string[] {
  const normalizedThemes: string[] = [];
  const seenThemes = new Set<string>();

  for (const themeName of themeNames) {
    const requestedThemeName = themeName.trim();
    if (!requestedThemeName) {
      continue;
    }

    const resolvedThemeName = resolveRequestedThemeName(requestedThemeName, installedThemes);
    const normalizedThemeName = resolvedThemeName ?? requestedThemeName;

    if (seenThemes.has(normalizedThemeName)) {
      continue;
    }

    seenThemes.add(normalizedThemeName);
    normalizedThemes.push(normalizedThemeName);
  }

  return normalizedThemes;
}

function parseLegacyThemeList(
  themeList: string,
  installedThemes: ThemeDescriptor[],
): string[] {
  return normalizeThemeNames(themeList.split(','), installedThemes);
}

function getPrimaryThemes(installedThemes: ThemeDescriptor[]): string[] {
  const config = getExtensionConfig();

  const explicitPrimaryThemes = getExplicitStringArraySetting(config, PRIMARY_THEMES_KEY);
  if (explicitPrimaryThemes !== undefined) {
    return normalizeThemeNames(explicitPrimaryThemes, installedThemes);
  }

  const explicitLegacyThemes = getExplicitStringArraySetting(config, LEGACY_THEMES_KEY);
  if (explicitLegacyThemes !== undefined) {
    return normalizeThemeNames(explicitLegacyThemes, installedThemes);
  }

  const explicitLegacyThemesList = getExplicitStringSetting(config, LEGACY_THEMES_LIST_KEY);
  if (explicitLegacyThemesList !== undefined) {
    return parseLegacyThemeList(explicitLegacyThemesList, installedThemes);
  }

  return normalizeThemeNames(config.get<string[]>(PRIMARY_THEMES_KEY, []), installedThemes);
}

function getSecondaryThemes(installedThemes: ThemeDescriptor[]): string[] {
  const config = getExtensionConfig();
  return normalizeThemeNames(config.get<string[]>(SECONDARY_THEMES_KEY, []), installedThemes);
}

function getCurrentThemeName(installedThemes: ThemeDescriptor[]): string {
  const currentThemeName = vscode.workspace.getConfiguration().get<string>(WORKBENCH_THEME_KEY) ?? '';
  return resolveRequestedThemeName(currentThemeName, installedThemes) ?? currentThemeName;
}

function getThemeNamesForSource(
  source: ThemeSource,
  installedThemes: ThemeDescriptor[],
): string[] {
  switch (source) {
    case 'primary':
      return getPrimaryThemes(installedThemes);
    case 'secondary':
      return getSecondaryThemes(installedThemes);
    default:
      return installedThemes.map((theme) => theme.name);
  }
}

function getEmptySourceMessage(source: ThemeSource): string {
  switch (source) {
    case 'primary':
      return 'Configure themeSwitcher.primaryThemes to use the primary-list commands.';
    case 'secondary':
      return 'Configure themeSwitcher.secondaryThemes to use the secondary-list commands.';
    default:
      return 'No installed themes were found.';
  }
}

function getSourceLabel(source: ThemeSource): string {
  switch (source) {
    case 'primary':
      return 'primary theme list';
    case 'secondary':
      return 'secondary theme list';
    default:
      return 'installed themes';
  }
}

function formatThemeNames(themeNames: readonly string[]): string {
  const visibleNames = themeNames.slice(0, 4);
  const remainingCount = themeNames.length - visibleNames.length;
  const suffix = remainingCount > 0 ? `, +${remainingCount} more` : '';

  return `${visibleNames.join(', ')}${suffix}`;
}

function getCandidateIndex(
  currentIndex: number,
  step: number,
  direction: CycleDirection,
  themeCount: number,
): number {
  if (currentIndex === -1) {
    return direction === 'previous' ? themeCount - step : step - 1;
  }

  return direction === 'previous'
    ? normalizeIndex(currentIndex - step, themeCount)
    : normalizeIndex(currentIndex + step, themeCount);
}

function findCycleCandidate(
  themeNames: readonly string[],
  installedThemes: ThemeDescriptor[],
  currentIndex: number,
  direction: CycleDirection,
): CycleCandidateResult {
  const skippedThemes: string[] = [];
  const seenSkippedThemes = new Set<string>();

  for (let step = 1; step <= themeNames.length; step += 1) {
    const candidateIndex = getCandidateIndex(currentIndex, step, direction, themeNames.length);
    const candidateName = themeNames[candidateIndex];
    const resolvedThemeName = resolveRequestedThemeName(candidateName, installedThemes);

    if (resolvedThemeName) {
      return {
        resolvedThemeName,
        skippedThemes,
      };
    }

    if (!seenSkippedThemes.has(candidateName)) {
      seenSkippedThemes.add(candidateName);
      skippedThemes.push(candidateName);
    }
  }

  return {
    skippedThemes,
  };
}

function showSkippedThemesWarning(skippedThemes: readonly string[]): void {
  if (skippedThemes.length === 0) {
    return;
  }

  const noun = skippedThemes.length === 1 ? 'theme' : 'themes';
  void vscode.window.showWarningMessage(
    `Skipped unavailable ${noun}: ${formatThemeNames(skippedThemes)}`,
  );
}

function showAllThemesMissingWarning(source: ThemeSource, missingThemes: readonly string[]): void {
  const sourceLabel = getSourceLabel(source);
  const details =
    missingThemes.length > 0 ? ` Missing: ${formatThemeNames(missingThemes)}` : '';

  void vscode.window.showWarningMessage(
    `None of the themes in the ${sourceLabel} are installed.${details}`,
  );
}

async function cycleThemesCommand(args: unknown): Promise<void> {
  const { source, direction, target } = parseCycleThemesArgs(args);
  const installedThemes = getInstalledThemes();
  const themeNames = getThemeNamesForSource(source, installedThemes);

  if (themeNames.length === 0) {
    void vscode.window.showWarningMessage(getEmptySourceMessage(source));
    return;
  }

  const currentThemeName = getCurrentThemeName(installedThemes);
  const currentIndex = themeNames.indexOf(currentThemeName);
  const { resolvedThemeName, skippedThemes } = findCycleCandidate(
    themeNames,
    installedThemes,
    currentIndex,
    direction,
  );

  if (!resolvedThemeName) {
    showAllThemesMissingWarning(source, skippedThemes);
    return;
  }

  await setThemeByName(resolvedThemeName, target, installedThemes);
  showSkippedThemesWarning(skippedThemes);
}

async function setThemeCommand(args: unknown): Promise<void> {
  const installedThemes = getInstalledThemes();
  const { theme, target = 'auto' } = parseSetThemeArgs(args);

  const themeName = theme ?? (await pickTheme(installedThemes));
  if (!themeName) {
    return;
  }

  await setThemeByName(themeName, target, installedThemes);
}

async function pickTheme(installedThemes: ThemeDescriptor[]): Promise<string | undefined> {
  if (installedThemes.length === 0) {
    void vscode.window.showWarningMessage('No installed themes were found.');
    return undefined;
  }

  const currentThemeName = getCurrentThemeName(installedThemes);
  const pickedTheme = await vscode.window.showQuickPick(
    installedThemes.map((theme) => ({
      label: theme.name,
      description: theme.name === currentThemeName ? 'Current theme' : undefined,
    })),
    {
      placeHolder: 'Select a theme',
      title: 'Theme Switcher+',
    },
  );

  return pickedTheme?.label;
}

async function setThemeByName(
  themeName: string,
  target: ThemeTarget,
  installedThemes: ThemeDescriptor[],
): Promise<void> {
  const resolvedThemeName = resolveRequestedThemeName(themeName, installedThemes);
  if (!resolvedThemeName) {
    void vscode.window.showWarningMessage(`Theme '${themeName}' is not installed.`);
    return;
  }

  const configurationTarget = getConfigurationTarget(target);
  if (configurationTarget === undefined) {
    return;
  }

  await vscode.workspace
    .getConfiguration()
    .update(WORKBENCH_THEME_KEY, resolvedThemeName, configurationTarget);

  void vscode.window.showInformationMessage(resolvedThemeName);
}

function getConfigurationTarget(target: ThemeTarget): vscode.ConfigurationTarget | undefined {
  if (target === 'global') {
    return vscode.ConfigurationTarget.Global;
  }

  if (target === 'workspace') {
    if (vscode.workspace.workspaceFolders?.length) {
      return vscode.ConfigurationTarget.Workspace;
    }

    void vscode.window.showWarningMessage('Open a workspace to use target=workspace.');
    return undefined;
  }

  return getAutoConfigurationTarget();
}

function getAutoConfigurationTarget(): vscode.ConfigurationTarget {
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
