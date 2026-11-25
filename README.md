# Tag Badges for Thunderbird

[Changelog](CHANGELOG.md) · [License](LICENSE) · [Privacy](PRIVACY.md) · [Slovensky](README.sk.md)

Colorful tag badges in Thunderbird’s message list.

Displays existing built-in and custom message tags as solid, high-contrast badges in table and cards views. Tags are managed by Thunderbird; this add-on only changes their presentation.

**Author:** EnjoyDev · **License:** [MIT](LICENSE) · **Compatibility:** Thunderbird 128 ESR only


## Features

- Multiple tag badges before or after the subject in table view.
- Badges in the bottom row of cards, replacing Thunderbird’s native tag icons.
- Independent switches for table and cards views.
- Independent maximum badge counts for table and cards views: `0` means no count limit.
- A `+N` counter for tags hidden by count limits or available width, with a full-name tooltip.
- Compact and normal badge sizes.
- Thunderbird order, alphabetical order, or a custom priority list keyed by tag IDs.
- Pill shape or a custom corner radius from 0 to 100 px.
- Optional preservation of native row coloring based on tags.
- Tag background colors from Thunderbird, with black or white text chosen for higher contrast.
- Optional debug logging, disabled by default.

The settings page follows Thunderbird’s UI language: English and Slovak are included, with English as the fallback for other languages. Status messages, preview labels and accessibility text are localized too; your actual tag names are preserved. Reopen the settings page after changing Thunderbird’s UI language. Support for newer Thunderbird versions is planned; this project is not yet published on Thunderbird Add-ons.

## Build and install

Requires Python 3; no third-party build dependencies.

```sh
git clone git@github.com:5ulo/thunderbird-tag-badges.git
cd thunderbird-tag-badges
python3 scripts/build.py
```

In Thunderbird, open **Add-ons and Themes → Extensions → gear menu → Install Add-on From File…**, then select `dist/tag-badges-thread-pane-0.2.2.xpi`. Open the extension’s preferences to configure it. Installing a newer version with the same add-on ID preserves saved settings.

Build output in `dist/` is local and excluded from Git.

## Updates and add-on details

Install version 0.2.2 manually once to enable the GitHub update channel. Later releases can be found through Thunderbird’s **Check for Updates** action in Add-ons and Themes, or installed automatically according to your add-on update preferences. Updating preserves existing settings; uninstalling is unnecessary. If the UI does not refresh after an update, fully quit and reopen Thunderbird.

The update manifest lives at [the latest release’s updates.json](https://github.com/5ulo/thunderbird-tag-badges/releases/latest/download/updates.json). It points to versioned XPI assets and includes SHA-256 checksums and Thunderbird compatibility limits. Each release automatically generates it and preserves earlier compatible entries. To generate metadata locally after building:

```sh
python3 scripts/update_manifest.py
# To preserve previous compatible versions:
python3 scripts/update_manifest.py --previous /path/to/previous/updates.json
```

The native **Details** tab displays a full English or Slovak description while the add-on is enabled. Since this package is distributed outside the add-on store, the existing Experiment API provides the description only for this add-on and removes the hook when disabled. The homepage links to this repository.

## Permissions and privacy

The add-on uses an Experiment API to modify Thunderbird’s native message list. Thunderbird therefore asks for full, unrestricted access at installation. The implementation reads message tags and renders badges; it does not modify message contents, tag definitions, or tag assignments.

The add-on contains no analytics or telemetry and does not send message data or preferences. Preferences are stored locally in Thunderbird. Thunderbird contacts GitHub to check for and download extension updates. Debug logging is optional and local. See [privacy information](PRIVACY.md).

## Display behavior

Tags follow the selected display order; custom priority changes presentation only and survives tag renaming. Tags without a color use a neutral gray background. Badges belong to the message represented by a row, not an aggregation of every message in a collapsed conversation. Group headers have no badges.

Only whole badges are shown; remaining tags are summarized as `+N`. The tooltip lists all tag names. Badges use the selected size and retain the full name rather than truncating individual tag names. Very long names therefore move into the tooltip if they cannot fit. When even the counter cannot fit, the group is hidden until more space is available.

In table view, the subject yields space to the badge group while keeping some room for subject text. Row heights remain unchanged to preserve virtual scrolling. Badges re-fit automatically when a column or pane is resized. Existing shared count limits from 0.1.x migrate to both new per-view limits.

Disabling cards integration restores the native tag icons. Disabling or uninstalling the add-on removes its UI changes and observers.

## Development and testing

Unit tests require Node.js:

```sh
node --test tests/*.test.cjs
python3 scripts/build.py
python3 scripts/smoke.py
# After publishing the current version, test native GitHub updates:
python3 scripts/smoke_updates.py
# Override the default macOS Thunderbird executable:
python3 scripts/smoke.py --thunderbird /path/to/thunderbird
```

The integration test launches Thunderbird with `-no-remote -headless` in a new temporary profile. It creates a local test message and tag, tests rendering, positioning, limits, toggles, tag renaming, corner radius, row colors, long subjects and cleanup, then stops the test process. It does not use your regular profile. Test instrumentation is excluded from the installable XPI.

Validated on **Thunderbird 128.9.1 on macOS** with DOM and layout integration checks, plus settings and contrast unit tests covering 4,096 RGB samples. Other operating systems, themes and densities still need manual visual testing. Compatibility is deliberately limited to `128.*` because the add-on uses internal UI components.

Implementation references: [Experiment API documentation](https://developer.thunderbird.net/add-ons/mailextensions/experiments), Thunderbird 128 [thread-row](https://hg.mozilla.org/releases/comm-esr128/file/tip/mail/base/content/widgets/treeview/thread-row.mjs) and [thread-card](https://hg.mozilla.org/releases/comm-esr128/file/tip/mail/base/content/widgets/treeview/thread-card.mjs).

## Feedback

Please report problems and suggestions through [GitHub Issues](https://github.com/5ulo/thunderbird-tag-badges/issues), including your Thunderbird version, OS, view type and relevant settings. Remove personal information from screenshots and logs.
