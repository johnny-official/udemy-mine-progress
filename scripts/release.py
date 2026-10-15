"""Validate and package the extension using only Python's standard library."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    'manifest.json', 'core.js', 'i18n.js', 'content.js', 'content.css',
    'popup.html', 'popup.js', 'popup.css', 'LICENSE', 'README.md',
)


def build(root, output, tag=None):
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    version = manifest.get('version', '')
    if not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', version):
        raise ValueError('Manifest version must use X.Y.Z without leading zeroes')
    if any(int(part) > 65535 for part in version.split('.')) or version == '0.0.0':
        raise ValueError('Manifest version is outside Chrome version limits')
    if tag is not None and tag != f'v{version}':
        raise ValueError(f'Tag must match manifest version: v{version}')
    if manifest.get('manifest_version') != 3:
        raise ValueError('Expected Manifest V3')
    references = [manifest['action']['default_popup']]
    for script in manifest['content_scripts']:
        references.extend(script.get('js', []))
        references.extend(script.get('css', []))
    if any(name not in FILES for name in references):
        raise ValueError('Manifest references a file outside the package allowlist')
    payload = {}
    for name in FILES:
        path = root / name
        if path.is_symlink() or not path.is_file():
            raise ValueError(f'Missing or unsafe package file: {name}')
        payload[name] = path.read_bytes()
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f'udemy-mine-progress-{version}.zip'
    # ponytail: Explicit allowlist for this static extension; update it when runtime files change.
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        for name, data in payload.items():
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, data)
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip() or set(bundle.namelist()) != set(FILES):
            raise ValueError('Package verification failed')
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (output / 'SHA256SUMS.txt').write_text(f'{digest}  {archive.name}\n', encoding='utf-8')
    return archive


def self_test():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for name in FILES:
            (root / name).write_text('fixture', encoding='utf-8')
        manifest = {'manifest_version': 3, 'version': '1.2.3',
                    'action': {'default_popup': 'popup.html'},
                    'content_scripts': [{'js': ['core.js'], 'css': ['content.css']}]}
        (root / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
        archive = build(root, root / 'dist', 'v1.2.3')
        first = archive.read_bytes()
        assert build(root, root / 'dist').read_bytes() == first
        with zipfile.ZipFile(archive) as bundle:
            assert set(bundle.namelist()) == set(FILES)
            assert json.loads(bundle.read('manifest.json'))['version'] == '1.2.3'
        assert (root / 'dist/SHA256SUMS.txt').read_text().split()[0] == hashlib.sha256(first).hexdigest()
        for tag in ('v9.0.0', '1.2.3', 'v1.2.3-beta'):
            try:
                build(root, root / 'dist', tag)
            except ValueError:
                pass
            else:
                raise AssertionError('Invalid tag accepted')
        (root / 'core.js').unlink()
        try:
            build(root, root / 'dist')
        except ValueError:
            pass
        else:
            raise AssertionError('Missing runtime file accepted')
    print('PASS: package contents, reproducibility, checksum, tag validation, missing files')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tag')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        print(build(ROOT, args.output, args.tag))
