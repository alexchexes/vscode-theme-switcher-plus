export type ThemeScope = 'auto' | 'global' | 'workspace';
export type CycleDirection = 'next' | 'previous';

export interface ContributedTheme {
  id?: string;
  label?: string;
  uiTheme?: string;
}

export interface ThemeDescriptor {
  name: string;
  aliases: Set<string>;
}

export interface ThemeList {
  id: string;
  normalizedId: string;
  themes: string[];
}

export interface CycleThemesArgs {
  listId?: string;
  direction?: CycleDirection;
  scope?: ThemeScope;
}

export interface SetThemeArgs {
  theme?: string;
  scope?: ThemeScope;
}

export interface CycleCandidateResult {
  resolvedThemeName?: string;
  skippedThemes: string[];
}
