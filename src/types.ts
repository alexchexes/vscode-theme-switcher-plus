export type ThemeSource = 'installed' | 'primary' | 'secondary';
export type ThemeTarget = 'auto' | 'global' | 'workspace';
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

export interface CycleThemesArgs {
  source?: ThemeSource;
  direction?: CycleDirection;
  target?: ThemeTarget;
}

export interface SetThemeArgs {
  theme?: string;
  target?: ThemeTarget;
}

export interface CycleCandidateResult {
  resolvedThemeName?: string;
  skippedThemes: string[];
}
