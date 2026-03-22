import { beforeEach, describe, expect, it } from 'vitest';

import {
  findCycleCandidate,
  getInstalledThemes,
  getInstalledThemeNames,
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

  it('orders installed themes alphabetically within UI groups and removes duplicates', () => {
    __setInstalledThemes([
      { label: 'Monokai', uiTheme: 'vs-dark' },
      { id: 'Zebra Light', uiTheme: 'vs' },
      { id: 'HC Black', uiTheme: 'hc-black' },
      { id: 'Abyss', uiTheme: 'vs-dark' },
      { id: 'A Light', uiTheme: 'vs' },
      { id: 'HC Light', uiTheme: 'hc-light' },
      { id: 'Mystery Theme' },
      { id: 'Another Mystery Theme' },
      { id: 'Monokai', label: 'Monokai', uiTheme: 'vs-dark' },
    ]);

    const themes = getInstalledThemes();

    expect(themes.map((theme) => theme.name)).toEqual([
      'A Light',
      'Zebra Light',
      'Abyss',
      'Monokai',
      'HC Black',
      'HC Light',
      'Another Mystery Theme',
      'Mystery Theme',
    ]);
    expect(themes.map((theme) => theme.group)).toEqual([
      'light',
      'light',
      'dark',
      'dark',
      'highContrast',
      'highContrast',
      undefined,
      undefined,
    ]);
    expect(getInstalledThemeNames(themes, 'highContrast')).toEqual([
      'HC Black',
      'HC Light',
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
