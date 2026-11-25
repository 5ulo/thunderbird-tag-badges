# Tag Badges for Thunderbird

Colorful tag badges in Thunderbird’s message list.

Displays existing built-in and custom message tags as solid, high-contrast badges in table and cards views. Tags are managed by Thunderbird; this add-on only changes their presentation.

**Author:** EnjoyDev · **License:** [MIT](LICENSE) · **Compatibility:** Thunderbird 128 ESR only

[Slovenská dokumentácia](README.sk.md)

## Features

- Multiple tag badges before or after the subject in table view.
- Badges in the bottom row of cards, replacing Thunderbird’s native tag icons.
- Independent switches for table and cards views.
- Configurable maximum number of badges: `0` means all tags.
- Pill shape or a custom corner radius from 0 to 100 px.
- Optional preservation of native row coloring based on tags.
- Tag background colors from Thunderbird, with black or white text chosen for higher contrast.
- Optional debug logging, disabled by default.

Settings are currently in Slovak. English localization and support for newer Thunderbird versions are planned; this project is not yet published on Thunderbird Add-ons.

## Build and install

Requires Python 3; no third-party build dependencies.

```sh
git clone git@github.com:5ulo/thunderbird-tag-badges.git
cd thunderbird-tag-badges
python3 scripts/build.py
```

In Thunderbird, open **Add-ons and Themes → Extensions → gear menu → Install Add-on From File…**, then select `dist/tag-badges-thread-pane-0.1.2.xpi`. Open the extension’s preferences to configure it. Installing a newer version with the same add-on ID preserves saved settings.

Build output in `dist/` is local and excluded from Git.

## Permissions and privacy

The add-on uses an Experiment API to modify Thunderbird’s native message list. Thunderbird therefore asks for full, unrestricted access at installation. The implementation reads message tags and renders badges; it does not modify message contents, tag definitions, or tag assignments.

The add-on makes no network requests and contains no analytics or telemetry. Preferences are stored locally in Thunderbird. Debug logging is optional and local. See [privacy information](PRIVACY.md).

## Display behavior

Tags follow Thunderbird’s tag order. Tags without a color use a neutral gray background. Badges belong to the message represented by a row, not an aggregation of every message in a collapsed conversation. Group headers have no badges.

In table view, badges retain their width and the subject yields space. Row heights remain unchanged to preserve virtual scrolling. If the badges themselves exceed the available width, they are clipped; individual long names are limited to 24ch with an ellipsis. A tooltip lists all tag names, including those hidden by the configured count limit.

Disabling cards integration restores the native tag icons. Disabling or uninstalling the add-on removes its UI changes and observers.

## Development and testing

Unit tests require Node.js:

```sh
node --test tests/*.test.cjs
python3 scripts/build.py
python3 scripts/smoke.py
# Override the default macOS Thunderbird executable:
python3 scripts/smoke.py --thunderbird /path/to/thunderbird
```

The integration test launches Thunderbird with `-no-remote -headless` in a new temporary profile. It creates a local test message and tag, tests rendering, positioning, limits, toggles, tag renaming, corner radius, row colors, long subjects and cleanup, then stops the test process. It does not use your regular profile. Test instrumentation is excluded from the installable XPI.

Validated on **Thunderbird 128.9.1 on macOS** with DOM and layout integration checks, plus settings and contrast unit tests covering 4,096 RGB samples. Other operating systems, themes and densities still need manual visual testing. Compatibility is deliberately limited to `128.*` because the add-on uses internal UI components.

Implementation references: [Experiment API documentation](https://developer.thunderbird.net/add-ons/mailextensions/experiments), Thunderbird 128 [thread-row](https://hg.mozilla.org/releases/comm-esr128/file/tip/mail/base/content/widgets/treeview/thread-row.mjs) and [thread-card](https://hg.mozilla.org/releases/comm-esr128/file/tip/mail/base/content/widgets/treeview/thread-card.mjs).

## Planned improvements

- A `+N` indicator for hidden tags.
- Separate badge limits for table and cards views.
- Compact and normal badge sizes.
- Configurable display order or tag priority.
- Show whole badges and summarize overflow with `+N`.

These features are not included in the current version. Please report problems and suggestions through [GitHub Issues](https://github.com/5ulo/thunderbird-tag-badges/issues), including your Thunderbird version, OS, view type and relevant settings. Remove personal information from screenshots and logs.
