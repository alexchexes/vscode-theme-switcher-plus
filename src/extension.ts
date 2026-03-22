import * as vscode from 'vscode';

import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext): void {
  registerCommands(context);
}
