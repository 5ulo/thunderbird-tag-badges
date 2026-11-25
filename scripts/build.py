#!/usr/bin/env python3
"""Build a reproducible installable XPI using only the Python standard library."""
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text())
files = ['manifest.json', 'settings.js', 'background.js', 'LICENSE']
for directory in ('experiments', 'options', '_locales'):
    files.extend(str(p.relative_to(root)) for p in (root / directory).rglob('*') if p.is_file())
output = root / 'dist' / f'tag-badges-thread-pane-{manifest["version"]}.xpi'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in sorted(files):
        info = ZipInfo(name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, (root / name).read_bytes())
print(output)
