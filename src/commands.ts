import * as vscode from 'vscode';

import { EXTENSION_PREFIX } from './constants';
import { getThemeListById, getThemeLists } from './config';
import { getConfigurationTarget } from './targets';
import {
  CycleDirection,
  InstalledThemeGroup,
  SetThemeArgs,
  ScopedCommandArgs,
  ThemeDescriptor,
  ThemeList,
  ThemeListCommandArgs,
  ThemeScope,
} from './types';
import {
  findCycleCandidate,
  formatThemeNames,
  getCurrentThemeName,
  getInstalledThemes,
  getInstalledThemeNames,
  resolveRequestedThemeName,
} from './themes';

const THEME_STATUS_MESSAGE_TIMEOUT_MS = 2000;

let activeThemeStatusMessage: vscode.Disposable | undefined;

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeScope(scope: unknown): ThemeScope {
  if (scope === 'global' || scope === 'workspace' || scope === 'auto') {
    return scope;
  }

  return 'auto';
}

function normalizeListId(listId: unknown): string | undefined {
  if (!isString(listId)) {
    return undefined;
  }

  return listId.trim();
}

function normalizeInstalledThemeGroup(
  group: unknown,
): InstalledThemeGroup | undefined {
  if (!isString(group)) {
    return undefined;
  }

  const normalizedGroup = group.trim().toLowerCase();
  if (normalizedGroup === 'light') {
    return 'light';
  }

  if (normalizedGroup === 'dark') {
    return 'dark';
  }

  if (
    normalizedGroup === 'highcontrast' ||
    normalizedGroup === 'high-contrast' ||
    normalizedGroup === 'high contrast'
  ) {
    return 'highContrast';
  }

  return undefined;
}

function parseSetThemeArgs(args: unknown): SetThemeArgs {
  if (isString(args)) {
    return {
      theme: args.trim(),
      scope: 'auto',
    };
  }

  if (!isRecord(args)) {
    return {
      scope: 'auto',
    };
  }

  return {
    theme: isString(args.theme) ? args.theme.trim() : undefined,
    scope: normalizeScope(args.scope),
  };
}

function parseInstalledThemeCommandArgs(
  args: unknown,
): Required<ScopedCommandArgs> & {
  group?: InstalledThemeGroup;
  invalidGroup?: string;
} {
  if (!isRecord(args)) {
    return {
      scope: 'auto',
    };
  }

  const rawGroup = args.group;
  const normalizedGroup = normalizeInstalledThemeGroup(rawGroup);

  return {
    scope: normalizeScope(args.scope),
    group: normalizedGroup,
    invalidGroup:
      rawGroup !== undefined &&
      normalizedGroup === undefined &&
      isString(rawGroup)
        ? rawGroup.trim()
        : undefined,
  };
}

function parseThemeListCommandArgs(
  args: unknown,
): Required<ThemeListCommandArgs> {
  if (!isRecord(args)) {
    return {
      listId: '',
      scope: 'auto',
    };
  }

  return {
    listId: normalizeListId(args.listId) ?? '',
    scope: normalizeScope(args.scope),
  };
}

function getThemeListSourceLabel(themeList: ThemeList): string {
  return `theme list '${themeList.id}'`;
}

function getInstalledThemeSourceLabel(group?: InstalledThemeGroup): string {
  if (group === undefined) {
    return 'installed themes';
  }

  switch (group) {
    case 'light':
      return 'installed light themes';
    case 'dark':
      return 'installed dark themes';
    case 'highContrast':
      return 'installed high contrast themes';
  }
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

function showAllThemesMissingWarning(
  sourceLabel: string,
  missingThemes: readonly string[],
): void {
  const details =
    missingThemes.length > 0
      ? ` Missing: ${formatThemeNames(missingThemes)}`
      : '';

  void vscode.window.showWarningMessage(
    `None of the themes in the ${sourceLabel} are installed.${details}`,
  );
}

function showThemeStatusMessage(themeName: string): void {
  activeThemeStatusMessage?.dispose();
  activeThemeStatusMessage = vscode.window.setStatusBarMessage(
    themeName,
    THEME_STATUS_MESSAGE_TIMEOUT_MS,
  );
}

async function pickThemeList(
  installedThemes: ThemeDescriptor[],
): Promise<ThemeList | undefined> {
  const themeLists = getThemeLists(installedThemes);
  if (themeLists.length === 0) {
    void vscode.window.showWarningMessage('No theme lists are configured.');
    return undefined;
  }

  const pickedThemeList = await vscode.window.showQuickPick(
    themeLists.map((themeList) => ({
      label: themeList.id,
      description: `${themeList.themes.length} theme${themeList.themes.length === 1 ? '' : 's'}`,
    })),
    {
      placeHolder: 'Select a theme list',
      title: 'Theme Switcher+',
    },
  );

  if (!pickedThemeList) {
    return undefined;
  }

  return themeLists.find((themeList) => themeList.id === pickedThemeList.label);
}

async function pickTheme(
  installedThemes: ThemeDescriptor[],
): Promise<string | undefined> {
  if (installedThemes.length === 0) {
    void vscode.window.showWarningMessage('No installed themes were found.');
    return undefined;
  }

  const currentThemeName = getCurrentThemeName(installedThemes);
  const pickedTheme = await vscode.window.showQuickPick(
    installedThemes.map((theme) => ({
      label: theme.name,
      description:
        theme.name === currentThemeName ? 'Current theme' : undefined,
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
  scope: ThemeScope,
  installedThemes: ThemeDescriptor[],
): Promise<void> {
  const resolvedThemeName = resolveRequestedThemeName(
    themeName,
    installedThemes,
  );
  if (!resolvedThemeName) {
    void vscode.window.showWarningMessage(
      `Theme '${themeName}' is not installed.`,
    );
    return;
  }

  const configurationTarget = getConfigurationTarget(scope);
  if (configurationTarget === undefined) {
    return;
  }

  await vscode.workspace
    .getConfiguration()
    .update('workbench.colorTheme', resolvedThemeName, configurationTarget);

  showThemeStatusMessage(resolvedThemeName);
}

async function cycleThemeNames(
  themeNames: readonly string[],
  direction: CycleDirection,
  scope: ThemeScope,
  installedThemes: ThemeDescriptor[],
  sourceLabel: string,
): Promise<void> {
  const currentThemeName = getCurrentThemeName(installedThemes);
  const currentIndex = themeNames.indexOf(currentThemeName);
  const { resolvedThemeName, skippedThemes } = findCycleCandidate(
    themeNames,
    installedThemes,
    currentIndex,
    direction,
  );

  if (!resolvedThemeName) {
    showAllThemesMissingWarning(sourceLabel, skippedThemes);
    return;
  }

  await setThemeByName(resolvedThemeName, scope, installedThemes);
  showSkippedThemesWarning(skippedThemes);
}

async function nextOrPreviousInstalledThemeCommand(
  direction: CycleDirection,
  args: unknown,
): Promise<void> {
  const { scope, group, invalidGroup } = parseInstalledThemeCommandArgs(args);
  if (invalidGroup) {
    void vscode.window.showWarningMessage(
      `Invalid installed theme group '${invalidGroup}'. Use light, dark, or highContrast.`,
    );
    return;
  }

  const installedThemes = getInstalledThemes();
  const themeNames = getInstalledThemeNames(installedThemes, group);

  if (themeNames.length === 0) {
    void vscode.window.showWarningMessage(
      `No ${getInstalledThemeSourceLabel(group)} were found.`,
    );
    return;
  }

  await cycleThemeNames(
    themeNames,
    direction,
    scope,
    installedThemes,
    getInstalledThemeSourceLabel(group),
  );
}

async function nextOrPreviousThemeInListCommand(
  direction: CycleDirection,
  args: unknown,
): Promise<void> {
  const installedThemes = getInstalledThemes();
  const { listId, scope } = parseThemeListCommandArgs(args);
  const themeList = listId
    ? getThemeListById(listId, installedThemes)
    : await pickThemeList(installedThemes);

  if (!themeList) {
    if (listId) {
      void vscode.window.showWarningMessage(
        `Theme list '${listId}' is not configured.`,
      );
    }

    return;
  }

  if (themeList.themes.length === 0) {
    void vscode.window.showWarningMessage(
      `Theme list '${themeList.id}' has no themes configured.`,
    );
    return;
  }

  await cycleThemeNames(
    themeList.themes,
    direction,
    scope,
    installedThemes,
    getThemeListSourceLabel(themeList),
  );
}

async function setThemeCommand(args: unknown): Promise<void> {
  const installedThemes = getInstalledThemes();
  const { theme, scope = 'auto' } = parseSetThemeArgs(args);

  const themeName = theme ?? (await pickTheme(installedThemes));
  if (!themeName) {
    return;
  }

  await setThemeByName(themeName, scope, installedThemes);
}

function registerCommand(
  context: vscode.ExtensionContext,
  command: string,
  callback: (...args: unknown[]) => Promise<void>,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(command, callback),
  );
}

function registerInstalledThemeCommand(
  context: vscode.ExtensionContext,
  command: string,
  direction: CycleDirection,
): void {
  registerCommand(context, command, async (args?: unknown) => {
    await nextOrPreviousInstalledThemeCommand(direction, args);
  });
}

function registerThemeListCommand(
  context: vscode.ExtensionContext,
  command: string,
  direction: CycleDirection,
): void {
  registerCommand(context, command, async (args?: unknown) => {
    await nextOrPreviousThemeInListCommand(direction, args);
  });
}

export function registerCommands(context: vscode.ExtensionContext): void {
  registerInstalledThemeCommand(
    context,
    `${EXTENSION_PREFIX}.nextInstalledTheme`,
    'next',
  );
  registerInstalledThemeCommand(
    context,
    `${EXTENSION_PREFIX}.previousInstalledTheme`,
    'previous',
  );
  registerThemeListCommand(
    context,
    `${EXTENSION_PREFIX}.nextThemeInList`,
    'next',
  );
  registerThemeListCommand(
    context,
    `${EXTENSION_PREFIX}.previousThemeInList`,
    'previous',
  );

  registerCommand(
    context,
    `${EXTENSION_PREFIX}.setTheme`,
    async (args?: unknown) => {
      await setThemeCommand(args);
    },
  );
}
