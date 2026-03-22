import * as vscode from 'vscode';

import { EXTENSION_PREFIX, PRIMARY_THEMES_KEY, SECONDARY_THEMES_KEY } from './constants';
import { ThemeDescriptor } from './types';
import { normalizeThemeNames } from './themes';

function getExtensionConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(EXTENSION_PREFIX);
}

export function getPrimaryThemes(installedThemes: ThemeDescriptor[]): string[] {
  const config = getExtensionConfig();
  return normalizeThemeNames(config.get<string[]>(PRIMARY_THEMES_KEY, []), installedThemes);
}

export function getSecondaryThemes(installedThemes: ThemeDescriptor[]): string[] {
  const config = getExtensionConfig();
  return normalizeThemeNames(config.get<string[]>(SECONDARY_THEMES_KEY, []), installedThemes);
}
