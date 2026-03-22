export type ThemeScope = 'auto' | 'global' | 'workspace';
export type CycleDirection = 'next' | 'previous';
export type InstalledThemeGroup = 'light' | 'dark' | 'highContrast';
export type RandomCandidateFailureReason = 'allMissing' | 'currentOnly';

export interface ContributedTheme {
  id?: string;
  label?: string;
  uiTheme?: string;
}

export interface ThemeDescriptor {
  name: string;
  aliases: Set<string>;
  group?: InstalledThemeGroup;
}

export interface ThemeList {
  id: string;
  normalizedId: string;
  themes: string[];
}

export interface ScopedCommandArgs {
  scope?: ThemeScope;
}

export interface InstalledThemeCommandArgs extends ScopedCommandArgs {
  group?: InstalledThemeGroup;
}

export interface ThemeListCommandArgs extends ScopedCommandArgs {
  listId?: string;
}

export interface SetThemeArgs {
  theme?: string;
  scope?: ThemeScope;
}

export interface CycleCandidateResult {
  resolvedThemeName?: string;
  skippedThemes: string[];
}

export interface RandomCandidateResult {
  resolvedThemeName?: string;
  skippedThemes: string[];
  failureReason?: RandomCandidateFailureReason;
}
