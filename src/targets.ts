import * as vscode from 'vscode';

import { COLOR_THEME_KEY, WORKBENCH_KEY } from './constants';
import { ThemeTarget } from './types';

export function getConfigurationTarget(
  target: ThemeTarget,
): vscode.ConfigurationTarget | undefined {
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
