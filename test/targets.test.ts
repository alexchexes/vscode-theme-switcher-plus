import { beforeEach, describe, expect, it } from 'vitest';

import { getConfigurationTarget } from '../src/targets';
import {
  __resetMockVscode,
  __setWorkbenchInspect,
  __setWorkspaceFolders,
  ConfigurationTarget,
  window,
} from './mocks/vscode';

describe('targets', () => {
  beforeEach(() => {
    __resetMockVscode();
  });

  it('returns explicit global and workspace targets when possible', () => {
    __setWorkspaceFolders([{ name: 'workspace' }]);

    expect(getConfigurationTarget('global')).toBe(ConfigurationTarget.Global);
    expect(getConfigurationTarget('workspace')).toBe(
      ConfigurationTarget.Workspace,
    );
  });

  it('warns when workspace scope is requested without an open workspace', () => {
    expect(getConfigurationTarget('workspace')).toBeUndefined();
    expect(window.showWarningMessage).toHaveBeenCalledWith(
      'Open a workspace to use scope=workspace.',
    );
  });

  it('prefers existing workspace theme settings when scope is auto', () => {
    __setWorkbenchInspect({ workspaceValue: 'Monokai' });

    expect(getConfigurationTarget('auto')).toBe(ConfigurationTarget.Workspace);
  });

  it('prefers existing global theme settings when scope is auto', () => {
    __setWorkbenchInspect({ globalValue: 'Monokai' });

    expect(getConfigurationTarget('auto')).toBe(ConfigurationTarget.Global);
  });

  it('falls back to global when auto is unset and a workspace is open', () => {
    __setWorkspaceFolders([{ name: 'workspace' }]);

    expect(getConfigurationTarget('auto')).toBe(ConfigurationTarget.Global);
  });

  it('falls back to global when auto is unset and no workspace is open', () => {
    expect(getConfigurationTarget('auto')).toBe(ConfigurationTarget.Global);
  });
});
