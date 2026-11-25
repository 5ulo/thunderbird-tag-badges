# Privacy — Tag Badges for Thunderbird

Author: EnjoyDev

The add-on reads existing message tags and their names and colors locally to display badges in Thunderbird’s message list. It does not modify messages, tag definitions or tag assignments.

Preferences are stored locally using Thunderbird’s extension storage. The add-on does not collect analytics, include telemetry, or transmit message data or preferences to the author or third parties. Thunderbird’s built-in updater contacts GitHub to check the update manifest and download new XPI releases according to your update preferences. GitHub receives ordinary connection information, such as the IP address and HTTP request information; message contents, tag names and local preferences are not included by this add-on.

Optional debug logging is disabled by default. When enabled, it writes local diagnostic messages to Thunderbird’s console. The add-on does not intentionally log message subjects or bodies. If you choose to share logs or screenshots in a support request, review them for personal information first.

An Experiment API is required to modify Thunderbird’s native UI, so Thunderbird requests full, unrestricted access during installation.
