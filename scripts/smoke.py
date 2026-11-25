#!/usr/bin/env python3
"""Run the integration fixture in Thunderbird using a NEW temporary profile."""
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
    (profile / 'user.js').write_text('''user_pref("devtools.console.stdout.chrome", true);
user_pref("extensions.logging.enabled", true);
user_pref("extensions.autoDisableScopes", 0);
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
    api = api.replace('listTags: async () =>', 'smokeOptionsResult: async result => { this.optionsResult = result; }, listTags: async () =>')
    diagnostic = str(profile / 'api-diagnostic.log')
    api = "IOUtils.writeUTF8(" + json.dumps(diagnostic) + ", 'API script loaded\\n');\nServices.console.registerListener({observe: message => { if (/tag.badges|Tag Badges|is not defined/.test(message.message)) IOUtils.writeUTF8(" + json.dumps(diagnostic) + ", message.message + '\\n', {mode:'append'}); }});\n" + api
    schema = json.loads((root / 'experiments/tagBadges/schema.json').read_text())
    schema[0]['functions'].append({'name':'smokeOptionsResult', 'type':'function', 'async':True, 'parameters':[{'name':'result','type':'object','additionalProperties':True}]})
    background = (root / 'background.js').read_text() + "\nmessenger.runtime.onMessage.addListener(message => { if (message?.command === 'smokeOptions') return messenger.tagBadges.smokeOptionsResult(message.result); });\n"
    options = (root / 'options/options.js').read_text() + '\n' + (root / 'tests/options-smoke.js').read_text()
    manifest = json.loads((root / 'manifest.json').read_text())
    target = extensions / (manifest['browser_specific_settings']['gecko']['id'] + '.xpi')
    with ZipFile(target, 'w') as archive:
        files = ['manifest.json', 'settings.js', 'background.js']
        for directory in ('experiments', 'options', '_locales'):
            files.extend(str(p.relative_to(root)) for p in (root / directory).rglob('*') if p.is_file())
        for name in files:
            overrides = {'experiments/tagBadges/api.js':api, 'experiments/tagBadges/schema.json':json.dumps(schema), 'background.js':background, 'options/options.js':options}
            archive.writestr(name, overrides.get(name, (root / name).read_bytes()))
    with (profile / 'process.log').open('w+') as log:
        process = subprocess.Popen([args.thunderbird, '-no-remote', '-headless', '-profile', str(profile)], stdout=log, stderr=log)
        try:
            deadline = time.monotonic() + 100
            while not report.exists() and process.poll() is None and time.monotonic() < deadline:
                time.sleep(.25)
            if not report.exists():
                log.seek(0)
                raise SystemExit('No test report. Thunderbird output:\n' + log.read() + '\n' + ((profile / 'api-diagnostic.log').read_text() if (profile / 'api-diagnostic.log').exists() else 'API never loaded'))
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
