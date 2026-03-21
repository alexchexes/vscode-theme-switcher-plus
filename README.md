# Theme Switcher+

Switch between themes using keyboard shortcuts and commands.

Theme Switcher+ can cycle through all installed themes, a primary theme list, or a secondary theme list. It can also switch directly to a specific theme and target either global or workspace settings.

## Default shortcuts

#### Previous theme - `Ctrl+Shift+F11`
Finds the previous installed theme and selects it.

#### Next theme - `Ctrl+Shift+F12`
Finds the next installed theme and selects it.

#### Previous selected theme - `Ctrl+Shift+F9`
Finds the previous theme in your configured list and selects it.

#### Next selected theme - `Ctrl+Shift+F10`
Finds the next theme in your configured list and selects it.

#### Secondary list commands
`Theme Switcher+: Next Secondary Theme` and `Theme Switcher+: Previous Secondary Theme` are available without default shortcuts.

## Settings

Configure the primary and secondary lists with:

```json
"themeSwitcher.primaryThemes": [
  "Visual Studio Dark",
  "Visual Studio Light"
],
"themeSwitcher.secondaryThemes": [
  "Monokai",
  "Default Dark+"
]
```

The legacy `themeSwitcher.themes` and `themeSwitcher.themesList` settings are still supported for compatibility, but both are deprecated in favor of `themeSwitcher.primaryThemes`.

## Command args

Use `themeSwitcher.setTheme` to switch directly to a theme:

```json
{
  "key": "ctrl+alt+1",
  "command": "themeSwitcher.setTheme",
  "args": {
    "theme": "Default Dark+",
    "target": "global"
  }
}
```

Use `themeSwitcher.cycleThemes` to cycle a specific source and target:

```json
{
  "key": "ctrl+alt+2",
  "command": "themeSwitcher.cycleThemes",
  "args": {
    "source": "secondary",
    "direction": "next",
    "target": "global"
  }
}
```

Supported values:

- `source`: `installed`, `primary`, `secondary`
- `direction`: `next`, `previous`
- `target`: `auto`, `global`, `workspace`

## Development

```bash
pnpm install
pnpm run check
```

Package the extension with:

```bash
pnpm run package
```

![](https://raw.githubusercontent.com/alexchexes/vscode-theme-switcher-plus/master/images/animation.gif)

<div>Icons made by <a href="https://www.flaticon.com/authors/ocha" title="OCHA">OCHA</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
