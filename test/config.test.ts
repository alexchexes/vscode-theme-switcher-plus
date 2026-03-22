import { beforeEach, describe, expect, it } from 'vitest';

import { getThemeListById, getThemeLists } from '../src/config';
import type { ThemeDescriptor } from '../src/types';
import { __resetMockVscode, __setExtensionConfig } from './mocks/vscode';

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

describe('config', () => {
  beforeEach(() => {
    __resetMockVscode();
  });

  it('parses configured theme lists, ignores invalid entries, and deduplicates ids', () => {
    __setExtensionConfig({
      themeLists: [
        {
          id: 'Main',
          themes: [' Default Dark+ ', 'Dark+', 'Missing Theme'],
        },
        {
          id: 'main',
          themes: ['Monokai'],
        },
        {
          id: 'Grammar Check',
          themes: ['Monokai', ''],
        },
        {
          id: 'Empty',
          themes: 'not-an-array',
        },
        {
          themes: ['Default Dark+'],
        },
      ],
    });

    expect(getThemeLists(installedThemes)).toEqual([
      {
        id: 'Main',
        normalizedId: 'main',
        themes: ['Default Dark+', 'Missing Theme'],
      },
      {
        id: 'Grammar Check',
        normalizedId: 'grammar check',
        themes: ['Monokai'],
      },
      {
        id: 'Empty',
        normalizedId: 'empty',
        themes: [],
      },
    ]);
  });

  it('finds a theme list by trimmed case-insensitive id', () => {
    __setExtensionConfig({
      themeLists: [
        {
          id: 'Grammar Check',
          themes: ['Monokai'],
        },
      ],
    });

    expect(getThemeListById('  grammar check  ', installedThemes)).toEqual({
      id: 'Grammar Check',
      normalizedId: 'grammar check',
      themes: ['Monokai'],
    });
  });
});
