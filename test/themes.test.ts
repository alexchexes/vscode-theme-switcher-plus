import { beforeEach, describe, expect, it } from 'vitest';

import {
  findCycleCandidate,
  getInstalledThemes,
  normalizeThemeNames,
  resolveRequestedThemeName,
} from '../src/themes';
import type { ThemeDescriptor } from '../src/types';
import { __resetMockVscode, __setInstalledThemes } from './mocks/vscode';

const installedThemes: ThemeDescriptor[] = [
  {
    name: 'Default Dark+',
    aliases: new Set(['Default Dark+', 'Dark+']),
  },
  {
    name: 'Monokai',
    aliases: new Set(['Monokai']),
  },
];

describe('themes', () => {
  beforeEach(() => {
    __resetMockVscode();
  });

  it('orders installed themes by UI group and removes duplicate resolved names', () => {
    __setInstalledThemes([
      { label: 'Monokai', uiTheme: 'vs-dark' },
      { id: 'Solarized Light', uiTheme: 'vs' },
      { id: 'HC', uiTheme: 'hc-black' },
      { id: 'Monokai', label: 'Monokai', uiTheme: 'vs-dark' },
    ]);

    expect(getInstalledThemes().map((theme) => theme.name)).toEqual([
      'Solarized Light',
      'Monokai',
      'HC',
    ]);
  });

  it('resolves aliases and deduplicates normalized theme names', () => {
    expect(resolveRequestedThemeName('Dark+', installedThemes)).toBe(
      'Default Dark+',
    );

    expect(
      normalizeThemeNames(
        [' Dark+ ', 'Default Dark+', '', 'Monokai'],
        installedThemes,
      ),
    ).toEqual(['Default Dark+', 'Monokai']);
  });

  it('cycles past missing themes and wraps around the list', () => {
    expect(
      findCycleCandidate(
        ['Missing Theme', 'Monokai', 'Default Dark+'],
        installedThemes,
        2,
        'next',
      ),
    ).toEqual({
      resolvedThemeName: 'Monokai',
      skippedThemes: ['Missing Theme'],
    });
  });

  it('reports all skipped themes when none of them are installed', () => {
    expect(
      findCycleCandidate(
        ['Missing One', 'Missing Two'],
        installedThemes,
        -1,
        'previous',
      ),
    ).toEqual({
      skippedThemes: ['Missing Two', 'Missing One'],
    });
  });
});
