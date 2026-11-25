# Changelog

## 0.3.0

- Support Thunderbird 161.0 while retaining compatibility with Thunderbird 128.
- Adapt cards to the modern thread-card-tags component and dynamic two-row/three-row layout.
- Load only the extension’s fixed local settings module using explicit script-loader options required by newer Gecko versions; global security preferences are unchanged.
- Raise the compatibility ceiling to 161.* and update localized compatibility information.
- Test both 128.9.1 and 161.0, including modern cards and repeated startup; extend updater tests to cover an incompatible older add-on.

## 0.2.3

- Keep card badges directly beside the star at the right edge, overriding native spacing and automatic button margins.
- Watch windows independently of shared extension window listeners and wait for partially loaded message panes.
- Re-scan existing windows when preferences are applied, allowing missed panes to recover without reinstalling.
- Isolate optional Details metadata failures from message-list initialization.
- Add regression tests for pending startup windows, saving preferences, card geometry and repeated real process startups.

## 0.2.2

- Show a localized full description in this add-on’s native Details tab while enabled.
- Add the project homepage to the add-on metadata.
- Enable Thunderbird’s standard update mechanism using GitHub Releases.
- Publish updates.json with versioned XPI links, SHA-256 checksums and compatibility limits; retain older compatible entries.
- Document the update channel and GitHub connections in the privacy information.
- Existing 0.2.1 installations need one manual update to enable the channel.

## 0.2.1

- Follow Thunderbird’s UI language using standard extension localization.
- Include English and Slovak, with English as the fallback for other languages.
- Localize settings, status and error messages, preview labels, description and hidden-tag accessibility text.
- Preserve user-defined tag names and existing settings.

## 0.2.0

- Add +N counters with complete tag-name tooltips for count and width overflow.
- Show only whole badges and re-fit on column or pane resizing.
- Add independent table and card limits, migrating existing shared limits.
- Add compact and normal badge sizes.
- Add alphabetical and custom priority display order without changing Thunderbird tags.
- Add quick links to both READMEs and expand integration coverage.

## 0.1.2

- Set the public add-on name to Tag Badges for Thunderbird and author to EnjoyDev.
- Preserve the GitHub repository’s MIT license and copyright notice.
- Prepare English and Slovak documentation, privacy information and the source repository.
- No badge rendering or settings changes.

## 0.1.1

- Prevent long subjects from shrinking and clipping the badge group in table view.
- Add layout regression checks for badges before and after long subjects.
- Include the MIT license in the installable package.

## 0.1.0

- Initial implementation for Thunderbird 128, with table and cards integration, display preferences and tests.
