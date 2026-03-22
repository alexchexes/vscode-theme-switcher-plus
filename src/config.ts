import * as vscode from 'vscode';

import { EXTENSION_PREFIX, THEME_LISTS_KEY } from './constants';
import { ThemeDescriptor, ThemeList } from './types';
import { normalizeThemeNames } from './themes';

function getExtensionConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(EXTENSION_PREFIX);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeListId(listId: string): string {
  return listId.trim().toLowerCase();
}

export function getThemeLists(installedThemes: ThemeDescriptor[]): ThemeList[] {
  const config = getExtensionConfig();
  const rawThemeLists = config.get<unknown[]>(THEME_LISTS_KEY, []);
  const themeLists: ThemeList[] = [];
  const seenListIds = new Set<string>();

  for (const rawThemeList of rawThemeLists) {
    if (!isRecord(rawThemeList) || !isString(rawThemeList.id)) {
      continue;
    }

    const id = rawThemeList.id.trim();
    const normalizedId = normalizeListId(id);
    if (seenListIds.has(normalizedId)) {
      continue;
    }

    seenListIds.add(normalizedId);

    const themeNames = Array.isArray(rawThemeList.themes)
      ? rawThemeList.themes.filter(isString)
      : [];

    themeLists.push({
      id,
      normalizedId,
      themes: normalizeThemeNames(themeNames, installedThemes),
    });
  }

  return themeLists;
}

export function getThemeListById(
  listId: string,
  installedThemes: ThemeDescriptor[],
): ThemeList | undefined {
  const normalizedId = normalizeListId(listId);
  return getThemeLists(installedThemes).find((themeList) => themeList.normalizedId === normalizedId);
}
