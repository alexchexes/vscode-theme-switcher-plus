# Theme Switcher+

Switch between themes using keyboard shortcuts and commands.

Theme Switcher+ can cycle through all installed themes or any configured theme list. It can also switch directly to a specific theme and write either global or workspace settings.

## Default shortcuts

#### Previous installed theme - `Ctrl+Shift+F11`

Finds the previous installed theme and selects it.

#### Next installed theme - `Ctrl+Shift+F12`

Finds the next installed theme and selects it.

Successful theme switches show the selected theme name briefly in the status bar.

## Settings

Configure custom lists with:

```json
"themeSwitcher.themeLists": [
  {
    "id": "main",
    "themes": ["Visual Studio Dark", "Visual Studio Light"]
  },
  {
    "id": "grammar-check",
    "themes": ["Monokai", "Default Dark+"]
  }
]
```

## Command args

Use `themeSwitcher.setTheme` to switch directly to a theme:

```jsonc
{
  "key": "ctrl+alt+1",
  "command": "themeSwitcher.setTheme",
  "args": {
    "theme": "Default Dark+",
    "scope": "global", // default is `auto`
  },
}
```

Use `themeSwitcher.nextThemeInList` or `themeSwitcher.previousThemeInList` to cycle a specific configured list:

```jsonc
{
  "key": "ctrl+alt+2",
  "command": "themeSwitcher.nextThemeInList",
  "args": {
    "listId": "grammar-check",
    "scope": "global", // default is `auto`
  },
}
```

Use `themeSwitcher.nextInstalledTheme` or `themeSwitcher.previousInstalledTheme` with `group` to cycle a built-in VS Code theme group:

```jsonc
{
  "key": "ctrl+alt+3",
  "command": "themeSwitcher.nextInstalledTheme",
  "args": {
    "group": "dark", // omit to cycle through all themes
    "scope": "global", // default is `auto`
  },
}
```

`scope: "auto"` means:

- if `workbench.colorTheme` is already set in workspace settings, update workspace
- if it is already set in global settings, update global
- if it is unset, use workspace when a workspace is open, otherwise use global

Supported values:

- `group`: `light`, `dark`, `highContrast` for installed-theme commands
- `listId`: any configured list id; omit it in list commands to pick a list from the Command Palette
- `scope`: `auto`, `global`, `workspace`

## Development

```bash
pnpm install
pnpm run check
```

Package the extension with:

```bash
pnpm run package
```

Package and install the current VSIX into local VS Code with:

```bash
pnpm run install-local
```

![](https://raw.githubusercontent.com/alexchexes/vscode-theme-switcher-plus/master/images/animation.gif)

<div>Icons made by <a href="https://www.flaticon.com/authors/ocha" title="OCHA">OCHA</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
