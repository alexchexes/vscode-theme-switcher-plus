import * as vscode from 'vscode';

import { EXTENSION_PREFIX } from './constants';
import { getThemeListById } from './config';
import { getConfigurationTarget } from './targets';
import {
  CycleDirection,
  CycleThemesArgs,
  SetThemeArgs,
  ThemeDescriptor,
  ThemeList,
  ThemeScope,
} from './types';
import {
  findCycleCandidate,
  formatThemeNames,
  getCurrentThemeName,
  getInstalledThemes,
  resolveRequestedThemeName,
} from './themes';

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

function normalizeDirection(direction: unknown): CycleDirection {
  if (direction === 'previous') {
    return 'previous';
  }

  return 'next';
}

function parseCycleThemesArgs(args: unknown): Required<CycleThemesArgs> {
  if (!isRecord(args)) {
    return {
      listId: '',
      direction: 'next',
      scope: 'auto',
    };
  }

  return {
    listId: normalizeListId(args.listId) ?? '',
    direction: normalizeDirection(args.direction),
    scope: normalizeScope(args.scope),
  };
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

function getInstalledThemeNames(installedThemes: ThemeDescriptor[]): string[] {
  return installedThemes.map((theme) => theme.name);
}

function getEmptyThemeNamesMessage(listId: string, themeList: ThemeList | undefined): string {
  if (!listId) {
    return 'No installed themes were found.';
  }

  if (!themeList) {
    return `Theme list '${listId}' is not configured.`;
  }

  return `Theme list '${themeList.id}' has no themes configured.`;
}

function getThemeSourceLabel(listId: string, themeList: ThemeList | undefined): string {
  if (!listId) {
    return 'installed themes';
  }

  return themeList ? `theme list '${themeList.id}'` : `theme list '${listId}'`;
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

function showAllThemesMissingWarning(sourceLabel: string, missingThemes: readonly string[]): void {
  const details =
    missingThemes.length > 0 ? ` Missing: ${formatThemeNames(missingThemes)}` : '';

  void vscode.window.showWarningMessage(
    `None of the themes in the ${sourceLabel} are installed.${details}`,
  );
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
  scope: ThemeScope,
  installedThemes: ThemeDescriptor[],
): Promise<void> {
  const resolvedThemeName = resolveRequestedThemeName(themeName, installedThemes);
  if (!resolvedThemeName) {
    void vscode.window.showWarningMessage(`Theme '${themeName}' is not installed.`);
    return;
  }

  const configurationTarget = getConfigurationTarget(scope);
  if (configurationTarget === undefined) {
    return;
  }

  await vscode.workspace
    .getConfiguration()
    .update('workbench.colorTheme', resolvedThemeName, configurationTarget);

  void vscode.window.showInformationMessage(resolvedThemeName);
}

async function cycleThemesCommand(args: unknown): Promise<void> {
  const { listId, direction, scope } = parseCycleThemesArgs(args);
  const installedThemes = getInstalledThemes();
  const themeList = listId ? getThemeListById(listId, installedThemes) : undefined;
  const themeNames = themeList ? themeList.themes : getInstalledThemeNames(installedThemes);

  if (themeNames.length === 0) {
    void vscode.window.showWarningMessage(getEmptyThemeNamesMessage(listId, themeList));
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
    showAllThemesMissingWarning(getThemeSourceLabel(listId, themeList), skippedThemes);
    return;
  }

  await setThemeByName(resolvedThemeName, scope, installedThemes);
  showSkippedThemesWarning(skippedThemes);
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
  context.subscriptions.push(vscode.commands.registerCommand(command, callback));
}

function registerCycleCommand(
  context: vscode.ExtensionContext,
  command: string,
  direction: CycleDirection,
): void {
  registerCommand(context, command, async () => {
    await cycleThemesCommand({ direction, scope: 'auto' });
  });
}

export function registerCommands(context: vscode.ExtensionContext): void {
  registerCycleCommand(context, `${EXTENSION_PREFIX}.nextInstalledTheme`, 'next');
  registerCycleCommand(context, `${EXTENSION_PREFIX}.previousInstalledTheme`, 'previous');

  registerCommand(context, `${EXTENSION_PREFIX}.cycleThemes`, async (args?: unknown) => {
    await cycleThemesCommand(args);
  });

  registerCommand(context, `${EXTENSION_PREFIX}.setTheme`, async (args?: unknown) => {
    await setThemeCommand(args);
  });
}
