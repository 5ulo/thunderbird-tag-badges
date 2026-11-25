#!/usr/bin/env python3
"""Run the integration fixture in Thunderbird 128 using a NEW temporary profile."""
import argparse
import json
import subprocess
import tempfile
import time
from pathlib import Path
from zipfile import ZipFile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--thunderbird', default='/Applications/Thunderbird.app/Contents/MacOS/thunderbird')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='tag-badges-test-') as temp:
    profile = Path(temp)
    extensions = profile / 'extensions'
    extensions.mkdir()
    report = profile / 'result.json'
    (profile / 'user.js').write_text('''user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.enabledScopes", 15);
user_pref("mail.shell.checkDefaultClient", false);
user_pref("mail.provider.suppress_dialog_on_startup", true);
user_pref("mailnews.start_page.enabled", false);
user_pref("mailnews.start_page.url", "about:blank");
user_pref("mailnews.database.global.indexer.enabled", false);
''')
    fixture = (root / 'tests/thunderbird-smoke.js').read_text().replace('SMOKE_RESULT_PATH', json.dumps(str(report)))
    api = (root / 'experiments/tagBadges/api.js').read_text().replace(
        'this.settings = this.shared.TagBadgeSettings.normalize(settings);',
        'this.settings = this.shared.TagBadgeSettings.normalize(settings);\n'
        'if (!this.smokeStarted) { this.smokeStarted = true; ' + fixture + ' }')
    manifest = json.loads((root / 'manifest.json').read_text())
    target = extensions / (manifest['browser_specific_settings']['gecko']['id'] + '.xpi')
    with ZipFile(target, 'w') as archive:
        files = ['manifest.json', 'settings.js', 'background.js']
        for directory in ('experiments', 'options'):
            files.extend(str(p.relative_to(root)) for p in (root / directory).rglob('*') if p.is_file())
        for name in files:
            archive.writestr(name, api if name == 'experiments/tagBadges/api.js' else (root / name).read_bytes())
    with (profile / 'process.log').open('w+') as log:
        process = subprocess.Popen([args.thunderbird, '-no-remote', '-headless', '-profile', str(profile)], stdout=log, stderr=log)
        try:
            deadline = time.monotonic() + 60
            while not report.exists() and process.poll() is None and time.monotonic() < deadline:
                time.sleep(.25)
            if not report.exists():
                log.seek(0)
                raise SystemExit('No test report. Thunderbird output:\n' + log.read())
            result = json.loads(report.read_text())
            print(json.dumps(result, indent=2, ensure_ascii=False))
            if not result['ok']:
                raise SystemExit(1)
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
