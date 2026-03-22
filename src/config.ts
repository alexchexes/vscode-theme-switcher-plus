import * as vscode from 'vscode';

import {
  EXTENSION_PREFIX,
  LEGACY_THEMES_KEY,
  LEGACY_THEMES_LIST_KEY,
  PRIMARY_THEMES_KEY,
  SECONDARY_THEMES_KEY,
} from './constants';
import { ThemeDescriptor } from './types';
import { normalizeThemeNames, parseLegacyThemeList } from './themes';

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

export function getPrimaryThemes(installedThemes: ThemeDescriptor[]): string[] {
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

export function getSecondaryThemes(installedThemes: ThemeDescriptor[]): string[] {
  const config = getExtensionConfig();
  return normalizeThemeNames(config.get<string[]>(SECONDARY_THEMES_KEY, []), installedThemes);
}
