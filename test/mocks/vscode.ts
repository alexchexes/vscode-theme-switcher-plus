import { vi } from 'vitest';

interface ConfigurationInspect<T> {
  defaultValue?: T;
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
}

interface MockTheme {
  id?: string;
  label?: string;
  uiTheme?: string;
}

interface QuickPickItem {
  label: string;
  description?: string;
}

type QuickPickSelection = string | QuickPickItem | undefined;

const state = {
  currentTheme: '',
  extensionConfig: {} as Record<string, unknown>,
  installedThemes: [] as MockTheme[],
  quickPickSelection: undefined as QuickPickSelection,
  registeredCommands: new Map<string, (...args: unknown[]) => Promise<void>>(),
  updateCalls: [] as { key: string; value: unknown; target: unknown }[],
  workbenchInspect: {} as ConfigurationInspect<string>,
  workspaceFolders: undefined as { name: string }[] | undefined,
};

function createDisposable(): { dispose: ReturnType<typeof vi.fn> } {
  return {
    dispose: vi.fn(),
  };
}

function createDefaultConfiguration() {
  return {
    get: vi.fn(<T>(key: string, defaultValue?: T): T => {
      if (key === 'workbench.colorTheme') {
        return (state.currentTheme || defaultValue) as T;
      }

      return defaultValue as T;
    }),
    inspect: vi.fn(() => undefined),
    update: vi.fn(async (key: string, value: unknown, target: unknown) => {
      state.updateCalls.push({ key, value, target });

      if (key === 'workbench.colorTheme' && typeof value === 'string') {
        state.currentTheme = value;
      }
    }),
  };
}

function createWorkbenchConfiguration() {
  return {
    get: vi.fn(<T>(_key: string, defaultValue?: T): T => defaultValue as T),
    inspect: vi.fn(<T>(_key: string): ConfigurationInspect<T> | undefined => {
      return state.workbenchInspect as ConfigurationInspect<T>;
    }),
    update: vi.fn(async () => undefined),
  };
}

function createExtensionConfiguration() {
  return {
    get: vi.fn(<T>(key: string, defaultValue?: T): T => {
      return (state.extensionConfig[key] ?? defaultValue) as T;
    }),
    inspect: vi.fn(() => undefined),
    update: vi.fn(async () => undefined),
  };
}

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
} as const;

export const commands = {
  registerCommand: vi.fn((command: string, callback: (...args: unknown[]) => Promise<void>) => {
    state.registeredCommands.set(command, callback);
    return createDisposable();
  }),
};

export const extensions = {
  get all(): { packageJSON: { contributes: { themes: MockTheme[] } } }[] {
    return [
      {
        packageJSON: {
          contributes: {
            themes: state.installedThemes,
          },
        },
      },
    ];
  },
};

export const window = {
  showInformationMessage: vi.fn(async (message: string) => message),
  showQuickPick: vi.fn(async (items: QuickPickItem[]) => {
    if (state.quickPickSelection === undefined) {
      return undefined;
    }

    if (typeof state.quickPickSelection === 'string') {
      return items.find((item) => item.label === state.quickPickSelection);
    }

    return state.quickPickSelection;
  }),
  showWarningMessage: vi.fn(async (message: string) => message),
};

export const workspace = {
  get workspaceFolders(): { name: string }[] | undefined {
    return state.workspaceFolders;
  },
  set workspaceFolders(value: { name: string }[] | undefined) {
    state.workspaceFolders = value;
  },
  getConfiguration: vi.fn((section?: string) => {
    if (section === 'themeSwitcher') {
      return createExtensionConfiguration();
    }

    if (section === 'workbench') {
      return createWorkbenchConfiguration();
    }

    return createDefaultConfiguration();
  }),
};

export function __getRegisteredCommand(
  command: string,
): ((...args: unknown[]) => Promise<void>) | undefined {
  return state.registeredCommands.get(command);
}

export function __getRegisteredCommandIds(): string[] {
  return [...state.registeredCommands.keys()];
}

export function __getUpdateCalls(): { key: string; value: unknown; target: unknown }[] {
  return [...state.updateCalls];
}

export function __resetMockVscode(): void {
  state.currentTheme = '';
  state.extensionConfig = {};
  state.installedThemes = [];
  state.quickPickSelection = undefined;
  state.registeredCommands.clear();
  state.updateCalls = [];
  state.workbenchInspect = {};
  state.workspaceFolders = undefined;

  commands.registerCommand.mockClear();
  workspace.getConfiguration.mockClear();
  window.showInformationMessage.mockClear();
  window.showQuickPick.mockClear();
  window.showWarningMessage.mockClear();
}

export function __setCurrentTheme(themeName: string): void {
  state.currentTheme = themeName;
}

export function __setExtensionConfig(config: Record<string, unknown>): void {
  state.extensionConfig = config;
}

export function __setInstalledThemes(themes: MockTheme[]): void {
  state.installedThemes = themes;
}

export function __setQuickPickSelection(selection: QuickPickSelection): void {
  state.quickPickSelection = selection;
}

export function __setWorkbenchInspect(inspect: ConfigurationInspect<string>): void {
  state.workbenchInspect = inspect;
}

export function __setWorkspaceFolders(workspaceFolders: { name: string }[] | undefined): void {
  state.workspaceFolders = workspaceFolders;
}
