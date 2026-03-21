# Theme Switcher+

Switch between themes using keyboard shortcuts.

Theme Switcher+ can cycle through all installed themes or through a curated list from settings.

## Default shortcuts

#### Previous theme - `Ctrl+Shift+F11`
Finds the previous installed theme and selects it.

#### Next theme - `Ctrl+Shift+F12`
Finds the next installed theme and selects it.

#### Previous selected theme - `Ctrl+Shift+F9`
Finds the previous theme in your configured list and selects it.

#### Next selected theme - `Ctrl+Shift+F10`
Finds the next theme in your configured list and selects it.

## Settings

Configure the curated theme list with:

```json
"themeSwitcher.themes": [
  "Visual Studio Dark",
  "Visual Studio Light"
]
```

The legacy `themeSwitcher.themesList` comma-separated setting is still supported for compatibility, but it is deprecated.

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
