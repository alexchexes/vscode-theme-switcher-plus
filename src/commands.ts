import * as vscode from 'vscode';

import { EXTENSION_PREFIX } from './constants';
import { getPrimaryThemes, getSecondaryThemes } from './config';
import { getConfigurationTarget } from './targets';
import {
  CycleDirection,
  CycleThemesArgs,
  SetThemeArgs,
  ThemeDescriptor,
  ThemeSource,
  ThemeTarget,
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
    .update('workbench.colorTheme', resolvedThemeName, configurationTarget);

  void vscode.window.showInformationMessage(resolvedThemeName);
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

function registerCommand(
  context: vscode.ExtensionContext,
  command: string,
  callback: (...args: unknown[]) => Promise<void>,
): void {
  context.subscriptions.push(vscode.commands.registerCommand(command, callback));
}

export function registerCommands(context: vscode.ExtensionContext): void {
  registerCommand(context, `${EXTENSION_PREFIX}.nextSelectedTheme`, async () => {
    await cycleThemesCommand({ source: 'primary', direction: 'next', target: 'auto' });
  });

  registerCommand(context, `${EXTENSION_PREFIX}.previousSelectedTheme`, async () => {
    await cycleThemesCommand({ source: 'primary', direction: 'previous', target: 'auto' });
  });

  registerCommand(context, `${EXTENSION_PREFIX}.nextTheme`, async () => {
    await cycleThemesCommand({ source: 'installed', direction: 'next', target: 'auto' });
  });

  registerCommand(context, `${EXTENSION_PREFIX}.previousTheme`, async () => {
    await cycleThemesCommand({ source: 'installed', direction: 'previous', target: 'auto' });
  });

  registerCommand(context, `${EXTENSION_PREFIX}.nextSecondaryTheme`, async () => {
    await cycleThemesCommand({ source: 'secondary', direction: 'next', target: 'auto' });
  });

  registerCommand(context, `${EXTENSION_PREFIX}.previousSecondaryTheme`, async () => {
    await cycleThemesCommand({ source: 'secondary', direction: 'previous', target: 'auto' });
  });

  registerCommand(context, `${EXTENSION_PREFIX}.cycleThemes`, async (args?: unknown) => {
    await cycleThemesCommand(args);
  });

  registerCommand(context, `${EXTENSION_PREFIX}.setTheme`, async (args?: unknown) => {
    await setThemeCommand(args);
  });
}
