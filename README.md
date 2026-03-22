# Theme Switcher+

Switch between themes using keyboard shortcuts and commands.

Theme Switcher+ can cycle through all installed themes or any configured theme list. It can also switch directly to a specific theme and write either global or workspace settings.

## Default shortcuts

#### Previous installed theme - `Ctrl+Shift+F11`
Finds the previous installed theme and selects it.

#### Next installed theme - `Ctrl+Shift+F12`
Finds the next installed theme and selects it.

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

```json
{
  "key": "ctrl+alt+1",
  "command": "themeSwitcher.setTheme",
  "args": {
    "theme": "Default Dark+",
    "scope": "global"
  }
}
```

Use `themeSwitcher.cycleThemes` to cycle a specific configured list:

```json
{
  "key": "ctrl+alt+2",
  "command": "themeSwitcher.cycleThemes",
  "args": {
    "listId": "grammar-check",
    "direction": "next",
    "scope": "global"
  }
}
```

Supported values:

- `listId`: any configured list id; omit it to cycle installed themes
- `direction`: `next`, `previous`
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
