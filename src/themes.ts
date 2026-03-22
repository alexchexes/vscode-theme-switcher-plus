import * as vscode from 'vscode';

import { WORKBENCH_THEME_KEY } from './constants';
import {
  ContributedTheme,
  CycleCandidateResult,
  CycleDirection,
  ThemeDescriptor,
} from './types';

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveContributedThemeName(theme: ContributedTheme): string {
  return theme.id ?? theme.label ?? '';
}

export function getInstalledThemes(): ThemeDescriptor[] {
  const installedThemes = vscode.extensions.all.flatMap((extension) => {
    const contributes = extension.packageJSON.contributes as
      | { themes?: ContributedTheme[] }
      | undefined;
    return contributes?.themes ?? [];
  });

  const lightThemes = installedThemes.filter((theme) => theme.uiTheme === 'vs');
  const darkThemes = installedThemes.filter(
    (theme) => theme.uiTheme === 'vs-dark',
  );
  const remainingThemes = installedThemes.filter(
    (theme) => theme.uiTheme !== 'vs' && theme.uiTheme !== 'vs-dark',
  );

  const seenThemes = new Set<string>();

  return [...lightThemes, ...darkThemes, ...remainingThemes]
    .filter((theme) => {
      const themeName = resolveContributedThemeName(theme);
      if (!themeName || seenThemes.has(themeName)) {
        return false;
      }

      seenThemes.add(themeName);
      return true;
    })
    .map((theme) => {
      const themeName = resolveContributedThemeName(theme);

      return {
        name: themeName,
        aliases: new Set([themeName, theme.id, theme.label].filter(isString)),
      };
    });
}

export function normalizeIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function resolveRequestedThemeName(
  requestedThemeName: string,
  installedThemes: ThemeDescriptor[],
): string | undefined {
  const normalizedThemeName = requestedThemeName.trim();
  if (!normalizedThemeName) {
    return undefined;
  }

  const installedTheme = installedThemes.find((theme) =>
    theme.aliases.has(normalizedThemeName),
  );
  return installedTheme?.name;
}

export function normalizeThemeNames(
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

    const resolvedThemeName = resolveRequestedThemeName(
      requestedThemeName,
      installedThemes,
    );
    const normalizedThemeName = resolvedThemeName ?? requestedThemeName;

    if (seenThemes.has(normalizedThemeName)) {
      continue;
    }

    seenThemes.add(normalizedThemeName);
    normalizedThemes.push(normalizedThemeName);
  }

  return normalizedThemes;
}

export function getCurrentThemeName(
  installedThemes: ThemeDescriptor[],
): string {
  const currentThemeName =
    vscode.workspace.getConfiguration().get<string>(WORKBENCH_THEME_KEY) ?? '';
  return (
    resolveRequestedThemeName(currentThemeName, installedThemes) ??
    currentThemeName
  );
}

export function formatThemeNames(themeNames: readonly string[]): string {
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

export function findCycleCandidate(
  themeNames: readonly string[],
  installedThemes: ThemeDescriptor[],
  currentIndex: number,
  direction: CycleDirection,
): CycleCandidateResult {
  const skippedThemes: string[] = [];
  const seenSkippedThemes = new Set<string>();

  for (let step = 1; step <= themeNames.length; step += 1) {
    const candidateIndex = getCandidateIndex(
      currentIndex,
      step,
      direction,
      themeNames.length,
    );
    const candidateName = themeNames[candidateIndex];
    const resolvedThemeName = resolveRequestedThemeName(
      candidateName,
      installedThemes,
    );

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
