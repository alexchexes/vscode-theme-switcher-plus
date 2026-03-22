import { beforeEach, describe, expect, it } from 'vitest';

import { getThemeListById, getThemeLists } from '../src/config';
import type { ThemeDescriptor } from '../src/types';
import {
  __resetMockVscode,
  __setExtensionConfig,
  __setExtensionInspect,
} from './mocks/vscode';

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

  it('merges global and workspace theme lists, with workspace overriding matching ids', () => {
    __setExtensionInspect({
      globalValue: [
        {
          id: 'Favorites',
          themes: ['Default Dark+'],
        },
        {
          id: 'Light',
          themes: ['Missing Theme'],
        },
      ],
      workspaceValue: [
        {
          id: 'Favorites',
          themes: ['Monokai'],
        },
        {
          id: 'Project',
          themes: ['Dark+'],
        },
      ],
    });

    expect(getThemeLists(installedThemes)).toEqual([
      {
        id: 'Favorites',
        normalizedId: 'favorites',
        themes: ['Monokai'],
      },
      {
        id: 'Light',
        normalizedId: 'light',
        themes: ['Missing Theme'],
      },
      {
        id: 'Project',
        normalizedId: 'project',
        themes: ['Default Dark+'],
      },
    ]);
  });
});
