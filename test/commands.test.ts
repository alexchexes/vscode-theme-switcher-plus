import { beforeEach, describe, expect, it } from 'vitest';

import { registerCommands } from '../src/commands';
import {
  __getRegisteredCommand,
  __getRegisteredCommandIds,
  __getUpdateCalls,
  __resetMockVscode,
  __setCurrentTheme,
  __setExtensionConfig,
  __setInstalledThemes,
  __setQuickPickSelection,
  __setWorkbenchInspect,
  ConfigurationTarget,
  window,
} from './mocks/vscode';

describe('commands', () => {
  beforeEach(() => {
    __resetMockVscode();
  });

  it('registers the public command surface', () => {
    const context = { subscriptions: [] } as unknown as {
      subscriptions: unknown[];
    };

    registerCommands(context as never);

    expect(__getRegisteredCommandIds()).toEqual([
      'themeSwitcher.nextInstalledTheme',
      'themeSwitcher.previousInstalledTheme',
      'themeSwitcher.nextThemeInList',
      'themeSwitcher.previousThemeInList',
      'themeSwitcher.setTheme',
    ]);
    expect(context.subscriptions).toHaveLength(5);
  });

  it('cycles the next theme from a picked list using auto scope', async () => {
    const context = { subscriptions: [] } as unknown as {
      subscriptions: unknown[];
    };
    __setInstalledThemes([
      { id: 'Default Dark+', uiTheme: 'vs-dark' },
      { id: 'Monokai', uiTheme: 'vs-dark' },
    ]);
    __setExtensionConfig({
      themeLists: [
        {
          id: 'grammar-check',
          themes: ['Default Dark+', 'Monokai'],
        },
      ],
    });
    __setCurrentTheme('Default Dark+');
    __setQuickPickSelection('grammar-check');
    __setWorkbenchInspect({ globalValue: 'Default Dark+' });

    registerCommands(context as never);

    const command = __getRegisteredCommand('themeSwitcher.nextThemeInList');
    expect(command).toBeDefined();

    await command?.();

    expect(__getUpdateCalls()).toEqual([
      {
        key: 'workbench.colorTheme',
        value: 'Monokai',
        target: ConfigurationTarget.Global,
      },
    ]);
    expect(window.showInformationMessage).toHaveBeenCalledWith('Monokai');
  });

  it('warns when a requested list id is not configured', async () => {
    const context = { subscriptions: [] } as unknown as {
      subscriptions: unknown[];
    };
    __setInstalledThemes([{ id: 'Default Dark+', uiTheme: 'vs-dark' }]);

    registerCommands(context as never);

    const command = __getRegisteredCommand('themeSwitcher.nextThemeInList');
    await command?.({ listId: 'missing-list' });

    expect(window.showWarningMessage).toHaveBeenCalledWith(
      "Theme list 'missing-list' is not configured.",
    );
  });
});
