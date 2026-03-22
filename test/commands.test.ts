import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the public command surface', () => {
    const context = { subscriptions: [] } as unknown as {
      subscriptions: unknown[];
    };

    registerCommands(context as never);

    expect(__getRegisteredCommandIds()).toEqual([
      'themeSwitcher.nextInstalledTheme',
      'themeSwitcher.previousInstalledTheme',
      'themeSwitcher.randomInstalledTheme',
      'themeSwitcher.nextThemeInList',
      'themeSwitcher.previousThemeInList',
      'themeSwitcher.randomThemeInList',
      'themeSwitcher.setTheme',
    ]);
    expect(context.subscriptions).toHaveLength(7);
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
    expect(window.setStatusBarMessage).toHaveBeenCalledWith('Monokai', 2000);
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

  it('cycles only inside the requested installed-theme group', async () => {
    const context = { subscriptions: [] } as unknown as {
      subscriptions: unknown[];
    };
    __setInstalledThemes([
      { id: 'Solarized Light', uiTheme: 'vs' },
      { id: 'Dark One', uiTheme: 'vs-dark' },
      { id: 'Dark Two', uiTheme: 'vs-dark' },
    ]);
    __setCurrentTheme('Dark One');
    __setWorkbenchInspect({ globalValue: 'Dark One' });

    registerCommands(context as never);

    const command = __getRegisteredCommand('themeSwitcher.nextInstalledTheme');
    await command?.({ group: 'dark' });

    expect(__getUpdateCalls()).toEqual([
      {
        key: 'workbench.colorTheme',
        value: 'Dark Two',
        target: ConfigurationTarget.Global,
      },
    ]);
  });

  it('picks a random theme from a list without reselecting the current theme', async () => {
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
          id: 'favorites',
          themes: ['Missing Theme', 'Default Dark+', 'Monokai'],
        },
      ],
    });
    __setCurrentTheme('Default Dark+');
    __setWorkbenchInspect({ globalValue: 'Default Dark+' });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    registerCommands(context as never);

    const command = __getRegisteredCommand('themeSwitcher.randomThemeInList');
    await command?.({ listId: 'favorites' });

    expect(__getUpdateCalls()).toEqual([
      {
        key: 'workbench.colorTheme',
        value: 'Monokai',
        target: ConfigurationTarget.Global,
      },
    ]);
    expect(window.showWarningMessage).toHaveBeenCalledWith(
      'Skipped unavailable theme: Missing Theme',
    );
  });

  it('warns when a random installed-theme pick has no alternative to choose', async () => {
    const context = { subscriptions: [] } as unknown as {
      subscriptions: unknown[];
    };
    __setInstalledThemes([{ id: 'Default Dark+', uiTheme: 'vs-dark' }]);
    __setCurrentTheme('Default Dark+');
    __setWorkbenchInspect({ globalValue: 'Default Dark+' });

    registerCommands(context as never);

    const command = __getRegisteredCommand(
      'themeSwitcher.randomInstalledTheme',
    );
    await command?.({ group: 'dark' });

    expect(__getUpdateCalls()).toEqual([]);
    expect(window.showWarningMessage).toHaveBeenCalledWith(
      'No other installed dark themes are available.',
    );
  });

  it('warns when an installed-theme group is invalid', async () => {
    const context = { subscriptions: [] } as unknown as {
      subscriptions: unknown[];
    };
    __setInstalledThemes([{ id: 'Default Dark+', uiTheme: 'vs-dark' }]);

    registerCommands(context as never);

    const command = __getRegisteredCommand('themeSwitcher.nextInstalledTheme');
    await command?.({ group: 'blue' });

    expect(window.showWarningMessage).toHaveBeenCalledWith(
      "Invalid installed theme group 'blue'. Use light, dark, or highContrast.",
    );
  });

  it('warns when an installed-theme group has no matching themes', async () => {
    const context = { subscriptions: [] } as unknown as {
      subscriptions: unknown[];
    };
    __setInstalledThemes([{ id: 'Default Dark+', uiTheme: 'vs-dark' }]);

    registerCommands(context as never);

    const command = __getRegisteredCommand('themeSwitcher.nextInstalledTheme');
    await command?.({ group: 'highContrast' });

    expect(window.showWarningMessage).toHaveBeenCalledWith(
      'No installed high contrast themes were found.',
    );
  });
});
