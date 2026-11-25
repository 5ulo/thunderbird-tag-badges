#!/usr/bin/env python3
"""Test first and subsequent Thunderbird startup with an unmodified production XPI."""
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
package = root / 'dist' / f'tag-badges-thread-pane-{manifest["version"]}.xpi'
with tempfile.TemporaryDirectory(prefix='tag-badges-restart-') as temp:
    profile = Path(temp)
    extensions = profile / 'extensions'
    extensions.mkdir()
    report = profile / 'result.json'
    (extensions / (manifest['browser_specific_settings']['gecko']['id'] + '.xpi')).write_bytes(package.read_bytes())
    (profile / 'user.js').write_text('''user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.enabledScopes", 15);
user_pref("mail.shell.checkDefaultClient", false);
user_pref("mail.provider.suppress_dialog_on_startup", true);
user_pref("mailnews.start_page.enabled", false);
user_pref("mailnews.start_page.url", "about:blank");
user_pref("mailnews.database.global.indexer.enabled", false);
''')
    controller = {'manifest_version':2,'name':'Restart test','version':'1.0',
                  'browser_specific_settings':{'gecko':{'id':'restart-test@local.invalid','strict_min_version':'128.0','strict_max_version':manifest['browser_specific_settings']['gecko']['strict_max_version']}},
                  'background':{'scripts':['background.js']},
                  'experiment_apis':{'restartProbe':{'schema':'schema.json','parent':{'scopes':['addon_parent'],'paths':[['restartProbe']],'script':'api.js'}}}}
    fixture = (root / 'tests/restart-smoke.js').read_text().replace('REPORT_PATH',json.dumps(str(report)))
    with ZipFile(extensions / 'restart-test@local.invalid.xpi','w') as archive:
        archive.writestr('manifest.json',json.dumps(controller))
        archive.writestr('api.js',fixture)
        archive.writestr('background.js','messenger.restartProbe.run();')
        archive.writestr('schema.json',json.dumps([{'namespace':'restartProbe','functions':[{'name':'run','type':'function','async':True,'parameters':[]}]}]))
    success = True
    for attempt in range(2):
        report.unlink(missing_ok=True)
        with (profile / f'process-{attempt}.log').open('w+') as log:
            process = subprocess.Popen([args.thunderbird,'-no-remote','-headless','-profile',str(profile)],stdout=log,stderr=log)
            try:
                deadline = time.monotonic()+50
                while not report.exists() and process.poll() is None and time.monotonic()<deadline:
                    time.sleep(.25)
                if not report.exists():
                    log.seek(0)
                    raise SystemExit('No restart report:\n'+log.read())
                result = json.loads(report.read_text())
                print(json.dumps(result,indent=2,ensure_ascii=False),flush=True)
                success = success and result['ok']
                process.wait(timeout=12)
            finally:
                if process.poll() is None:
                    process.terminate()
                    try: process.wait(timeout=8)
                    except subprocess.TimeoutExpired: process.kill();process.wait()
    if not success: raise SystemExit(1)
