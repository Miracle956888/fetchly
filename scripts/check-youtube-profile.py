#!/usr/bin/env python3
"""Offline sanity check for the optional client profile in the pinned yt-dlp.

Requires yt-dlp[default]==2026.11.23 and Node 22+. This uses yt-dlp internals
intentionally: revisit it whenever the engine pin changes. It does not access
YouTube or demonstrate that analysis or downloads will succeed on Render.
"""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from yt_dlp import YoutubeDL, parse_options
from yt_dlp.extractor.youtube._video import YoutubeIE
from yt_dlp.version import __version__


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


require(__version__ == '2026.11.23', f'Expected the pinned yt-dlp 2026.11.23, got {__version__}')
node = shutil.which('node')
require(node is not None, 'Node 22+ must be available to check the Render profile')
try:
    node_major = int(subprocess.check_output([node, '--version'], text=True).strip().lstrip('v').split('.')[0])
except (OSError, ValueError, subprocess.CalledProcessError) as exc:
    raise SystemExit(f'Could not check the Node version: {exc}') from exc
require(node_major >= 22, f'Node 22+ is required; found major version {node_major}')

common = [
    '--no-warnings', '--no-playlist', '--socket-timeout', '20', '--retries', '2',
    '--js-runtimes', 'node', '--ignore-config', '--no-cookies',
    '--no-cookies-from-browser', '--no-plugin-dirs',
]
url = 'https://www.youtube.com/watch?v=abcdefghijk'


def clients(experiment: bool) -> list[str]:
    args = ['--dump-single-json', '--skip-download', *common]
    if experiment:
        args.extend(['--extractor-args', 'youtube:player_client=default,ios_producer'])
    parsed = parse_options([*args, url])
    opts = parsed.ydl_opts
    require(parsed.options.plugin_dirs == [], 'Unexpected plugin directories')
    require(opts['cookiefile'] is None and opts['cookiesfrombrowser'] is None, 'Account cookie file/browser was enabled')
    require(not opts['usenetrc'] and not opts['username'] and not opts['password'], 'Account authentication was enabled')
    with YoutubeDL(opts) as ydl:
        ie = YoutubeIE(ydl)
        ie.initialize()
        require(not ie.is_authenticated, 'Extractor unexpectedly initialized as authenticated')
        return ie._get_requested_clients(url, {}, False)


with tempfile.TemporaryDirectory(prefix='fetchly-profile-config-') as temp:
    # Verify --ignore-config prevents accidental credentials or a different
    # client profile being picked up from an operator's configuration file.
    config = Path(temp) / 'yt-dlp' / 'config'
    config.parent.mkdir()
    config.write_text('--netrc\n--cookies /nonexistent\n--extractor-args youtube:player_client=web\n')
    old_xdg = os.environ.get('XDG_CONFIG_HOME')
    os.environ['XDG_CONFIG_HOME'] = temp
    try:
        baseline = clients(False)
        candidate = clients(True)
    finally:
        if old_xdg is None:
            del os.environ['XDG_CONFIG_HOME']
        else:
            os.environ['XDG_CONFIG_HOME'] = old_xdg

require('ios_producer' not in baseline, 'Pinned defaults changed; review the experiment')
require(candidate == [*baseline, 'ios_producer'], 'Unexpected client profile; review the experiment')
print(f'yt-dlp {__version__}: baseline={baseline}; experiment={candidate}')
print('Offline configuration check only; no YouTube request or Render download was tested.')
