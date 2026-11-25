#!/usr/bin/env python3
"""Generate GitHub-hosted Thunderbird update metadata for a built XPI."""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://github.com/5ulo/thunderbird-tag-badges/releases'


def make_updates(manifest, package, previous=None):
    gecko = manifest['browser_specific_settings']['gecko']
    version = manifest['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Stable release version must use X.Y.Z')
    name = f'tag-badges-thread-pane-{version}.xpi'
    entry = {
        'version': version,
        'update_link': f'{BASE}/download/v{version}/{name}',
        'update_hash': 'sha256:' + hashlib.sha256(package).hexdigest(),
        'update_info_url': f'{BASE}/tag/v{version}',
        'applications': {'gecko': {key: gecko[key] for key in ('strict_min_version', 'strict_max_version')}},
    }
    # Preserve older compatible releases if a future major version drops TB 128.
    entries = (previous or {}).get('addons', {}).get(gecko['id'], {}).get('updates', [])
    for old in entries:
        if not old.get('update_link', '').startswith(BASE + '/download/'):
            raise ValueError('Previous update links must belong to this repository')
        if not re.fullmatch(r'sha256:[0-9a-f]{64}', old.get('update_hash', '')):
            raise ValueError('Previous entries must have a SHA-256 checksum')
    entries = [old for old in entries if old['version'] != version] + [entry]
    return {'addons': {gecko['id']: {'updates': entries}}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--previous', type=Path)
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    version = manifest['version']
    package = ROOT / 'dist' / f'tag-badges-thread-pane-{version}.xpi'
    previous = json.loads(args.previous.read_text()) if args.previous else None
    result = make_updates(manifest, package.read_bytes(), previous)
    output = ROOT / 'dist' / 'updates.json'
    output.write_text(json.dumps(result, indent=2) + '\n')
    print(output)


if __name__ == '__main__':
    main()
