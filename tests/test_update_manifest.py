import copy
import hashlib
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('update_manifest', Path(__file__).resolve().parents[1] / 'scripts/update_manifest.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class UpdateManifestTests(unittest.TestCase):
    def setUp(self):
        self.gecko = {'id': 'test@local.invalid', 'strict_min_version': '128.0', 'strict_max_version': '128.*'}
        self.manifest = {'version': '0.2.2', 'browser_specific_settings': {'gecko': self.gecko}}

    def entries(self, result):
        return result['addons'][self.gecko['id']]['updates']

    def test_hash_urls_and_compatibility(self):
        entry = self.entries(module.make_updates(self.manifest, b'package'))[0]
        self.assertEqual(entry['update_hash'], 'sha256:' + hashlib.sha256(b'package').hexdigest())
        self.assertEqual(entry['update_link'], module.BASE + '/download/v0.2.2/tag-badges-thread-pane-0.2.2.xpi')
        self.assertEqual(entry['applications']['gecko']['strict_max_version'], '128.*')

    def test_keeps_old_compatible_versions_and_replaces_current_entry(self):
        previous = module.make_updates(self.manifest, b'old')
        updated = module.make_updates(self.manifest, b'new', previous)
        self.assertEqual(len(self.entries(updated)), 1)
        self.assertNotEqual(self.entries(previous)[0]['update_hash'], self.entries(updated)[0]['update_hash'])
        newer = copy.deepcopy(self.manifest)
        newer['version'] = '0.3.0'
        newer['browser_specific_settings']['gecko']['strict_min_version'] = '140.0'
        newer['browser_specific_settings']['gecko']['strict_max_version'] = '140.*'
        entries = self.entries(module.make_updates(newer, b'new', previous))
        self.assertEqual([e['applications']['gecko']['strict_max_version'] for e in entries], ['128.*', '140.*'])

    def test_rejects_untrusted_previous_download(self):
        previous = module.make_updates(self.manifest, b'old')
        self.entries(previous)[0]['update_link'] = 'https://example.invalid/package.xpi'
        with self.assertRaises(ValueError):
            module.make_updates(self.manifest, b'new', previous)
