#!/usr/bin/env python3
"""Prepare pinned Linux x86-64 media engines for the experimental Netlify Server.

Only run during the Netlify build, not at request time. No packages are
installed into the repository. Each downloaded archive and executable is
verified before it is bundled. The older npm fallback is byte-for-byte the
official yt-dlp 2026.08.19 Linux release (verified against its published hash).
"""

import hashlib
import os
import platform
import shutil
import subprocess
import tarfile
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'netlify' / 'server' / 'bin'

YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.26/yt-dlp_linux'
YTDLP_SHA = '767ba9dce7052aa196f8b12652f433d76de128ba168966fa84b6394d5e6c6795'
YTDLP_FALLBACK_URL = 'https://registry.npmjs.org/@involvex/yt-dlp-binary-linux-x64/-/yt-dlp-binary-linux-x64-2026.8.22.tgz'
YTDLP_FALLBACK_ARCHIVE_SHA = '512359896b3c36119d146eb1468932e8c19913189ba42ee4363ae263e8af2215'
YTDLP_FALLBACK_SHA = '58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a'
FFMPEG_URL = 'https://files.pythonhosted.org/packages/a0/2d/43c8522a2038e9d0e7dbdf3a61195ecc31ca576fb1527a528c877e87d973/imageio_ffmpeg-0.6.0-py3-none-manylinux2014_x86_64.whl'
FFMPEG_ARCHIVE_SHA = 'c7e46fcec401dd990405049d2e2f475e2b397779df2519b544b8aab515195282'
FFMPEG_SHA = 'e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99'
FFPROBE_URL = 'https://registry.npmjs.org/@ffprobe-installer/linux-x64/-/linux-x64-5.2.0.tgz'
FFPROBE_ARCHIVE_SHA = '8b6b2e34bad5ea7cfbe1914185145f514f620f24203a1a421e8d00a698bf8e61'
FFPROBE_SHA = '576c21674291ec1948d507ea8ab0d78eb6621a0be8c6f1a6db0f50c5fcb1e0f9'


class IntegrityError(Exception):
    pass


def verify(path: Path, expected: str) -> None:
    digest = hashlib.sha256()
    with path.open('rb') as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b''):
            digest.update(chunk)
    if digest.hexdigest() != expected:
        raise IntegrityError(f'Checksum mismatch for {path.name}; refusing to use it.')


def download(url: str, output: Path, expected: str) -> None:
    print(f'Downloading {url}', flush=True)
    request = urllib.request.Request(url, headers={'User-Agent': 'Fetchly-Netlify-build/1'})
    with urllib.request.urlopen(request, timeout=30) as response, output.open('wb') as target:
        total = 0
        while chunk := response.read(1024 * 1024):
            total += len(chunk)
            if total > 200 * 1024 * 1024:
                raise IntegrityError('Download exceeded the size limit.')
            target.write(chunk)
    verify(output, expected)


def copy_member(source, destination: Path, expected: str) -> None:
    with source, destination.open('wb') as target:
        shutil.copyfileobj(source, target)
    verify(destination, expected)
    destination.chmod(0o755)


def main() -> None:
    if platform.system() != 'Linux' or platform.machine() not in ('x86_64', 'amd64'):
        raise SystemExit('Netlify engine preparation requires Linux x86-64.')
    DEST.mkdir(parents=True, exist_ok=True)
    for name in ('yt-dlp', 'ffmpeg', 'ffprobe'):
        (DEST / name).unlink(missing_ok=True)

    with tempfile.TemporaryDirectory(prefix='fetchly-netlify-build-') as folder:
        temp = Path(folder)
        ytdlp = DEST / 'yt-dlp'
        if os.environ.get('FETCHLY_USE_NPM_YTDLP_FALLBACK') != '1':
            try:
                download(YTDLP_URL, ytdlp, YTDLP_SHA)
                ytdlp.chmod(0o755)
            except (OSError, urllib.error.URLError) as error:
                # A blocked GitHub release-assets host is a network error, not
                # an integrity error. Never fall back after a checksum mismatch.
                print(f'WARNING: official yt-dlp download unavailable ({error}).', flush=True)
                ytdlp.unlink(missing_ok=True)
        if not ytdlp.exists():
            print('WARNING: using the older verified yt-dlp 2026.08.19 npm mirror.', flush=True)
            archive = temp / 'yt-dlp.tgz'
            download(YTDLP_FALLBACK_URL, archive, YTDLP_FALLBACK_ARCHIVE_SHA)
            with tarfile.open(archive, 'r:gz') as tar:
                source = tar.extractfile('package/yt-dlp')
                if source is None:
                    raise IntegrityError('yt-dlp missing from archive.')
                copy_member(source, ytdlp, YTDLP_FALLBACK_SHA)

        wheel = temp / 'ffmpeg.whl'
        download(FFMPEG_URL, wheel, FFMPEG_ARCHIVE_SHA)
        with zipfile.ZipFile(wheel) as archive:
            copy_member(
                archive.open('imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'),
                DEST / 'ffmpeg', FFMPEG_SHA,
            )

        archive = temp / 'ffprobe.tgz'
        download(FFPROBE_URL, archive, FFPROBE_ARCHIVE_SHA)
        with tarfile.open(archive, 'r:gz') as tar:
            source = tar.extractfile('package/ffprobe')
            if source is None:
                raise IntegrityError('ffprobe missing from archive.')
            copy_member(source, DEST / 'ffprobe', FFPROBE_SHA)

    # Catch architecture, permission and missing-library problems at build time.
    for name, argument in [('yt-dlp', '--version'), ('ffmpeg', '-version'), ('ffprobe', '-version')]:
        version = subprocess.check_output([str(DEST / name), argument], text=True, timeout=30).splitlines()[0]
        print(f'Prepared {name}: {version}', flush=True)


if __name__ == '__main__':
    main()
