import * as vscode from 'vscode';

import { COLOR_THEME_KEY, WORKBENCH_KEY } from './constants';
import { ThemeScope } from './types';

export function getConfigurationTarget(
  scope: ThemeScope,
): vscode.ConfigurationTarget | undefined {
  if (scope === 'global') {
    return vscode.ConfigurationTarget.Global;
  }

  if (scope === 'workspace') {
    if (vscode.workspace.workspaceFolders?.length) {
      return vscode.ConfigurationTarget.Workspace;
    }

    void vscode.window.showWarningMessage(
      'Open a workspace to use scope=workspace.',
    );
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
