#!/usr/bin/env python3
"""Test GitHub updates end to end in a NEW temporary Thunderbird profile.

Requires the current source version to have been published. The bootstrap XPI
is a test-only copy with version 0.0.0; no installed user profile is accessed.
"""
import argparse
import json
import subprocess
import tempfile
import time
from pathlib import Path
from zipfile import ZipFile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--thunderbird', default='/Applications/Thunderbird.app/Contents/MacOS/thunderbird')
args = parser.parse_args()
manifest = json.loads((root / 'manifest.json').read_text())
version = manifest['version']
addon_id = manifest['browser_specific_settings']['gecko']['id']
package = root / 'dist' / f'tag-badges-thread-pane-{version}.xpi'
with tempfile.TemporaryDirectory(prefix='tag-badges-updater-') as temp:
    profile = Path(temp)
    (profile / 'extensions').mkdir()
    report = profile / 'result.json'
    (profile / 'user.js').write_text('''user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.enabledScopes", 15);
user_pref("mail.shell.checkDefaultClient", false);
user_pref("mail.provider.suppress_dialog_on_startup", true);
user_pref("mailnews.start_page.enabled", false);
user_pref("mailnews.start_page.url", "about:blank");
user_pref("mailnews.database.global.indexer.enabled", false);
''')
    with ZipFile(package) as original, ZipFile(profile / 'extensions' / (addon_id + '.xpi'), 'w') as bootstrap:
        for name in original.namelist():
            data = original.read(name)
            if name == 'manifest.json':
                test_manifest = json.loads(data)
                test_manifest['version'] = '0.0.0'
                data = json.dumps(test_manifest).encode()
            bootstrap.writestr(name, data)
    controller = {'manifest_version': 2, 'name': 'Native updater test', 'version': '1.0',
                  'browser_specific_settings': {'gecko': {'id': 'updater-test@local.invalid', 'strict_min_version': '128.0', 'strict_max_version': '128.*'}},
                  'background': {'scripts': ['background.js']},
                  'experiment_apis': {'updaterProbe': {'schema': 'schema.json', 'parent': {'scopes': ['addon_parent'], 'paths': [['updaterProbe']], 'script': 'api.js'}}}}
    fixture = (root / 'tests/updater-smoke.js').read_text().replace('ADDON_ID', json.dumps(addon_id)).replace('EXPECTED_VERSION', json.dumps(version)).replace('REPORT_PATH', json.dumps(str(report))).replace('MARKER_PATH', json.dumps(str(profile / 'updated-settings.json')))
    with ZipFile(profile / 'extensions/updater-test@local.invalid.xpi', 'w') as archive:
        archive.writestr('manifest.json', json.dumps(controller))
        archive.writestr('api.js', fixture)
        archive.writestr('background.js', 'messenger.updaterProbe.run();')
        archive.writestr('schema.json', json.dumps([{'namespace': 'updaterProbe', 'functions': [{'name': 'run', 'type': 'function', 'async': True, 'parameters': []}]}]))
    for attempt in range(2):
        report.unlink(missing_ok=True)
        with (profile / f'process-{attempt}.log').open('w+') as log:
            process = subprocess.Popen([args.thunderbird, '-no-remote', '-headless', '-profile', str(profile)], stdout=log, stderr=log)
            try:
                deadline = time.monotonic() + 100
                while not report.exists() and process.poll() is None and time.monotonic() < deadline:
                    time.sleep(.25)
                if not report.exists():
                    log.seek(0)
                    raise SystemExit('No updater test report:\n' + log.read())
                result = json.loads(report.read_text())
                print(json.dumps(result, indent=2, ensure_ascii=False), flush=True)
                if not result['ok']:
                    raise SystemExit(1)
                process.wait(timeout=12)
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=8)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
