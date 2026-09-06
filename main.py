"""EPW Synoptic Editor - native desktop launcher.

Runs the existing editor (React + TypeScript + Konva, built by
`npm run build`) inside a native OS window via pywebview, instead of a
browser tab - no address bar, no tabs, no browser chrome. The frontend
itself is completely unchanged: this only serves the already-built
`dist/` folder over a local, loopback-only HTTP server and points a
pywebview window at that URL. On Windows, pywebview renders through the
WebView2 (Edge/Chromium) runtime that ships with the OS - same engine
the app already ran on in a browser tab, just without the browser's own
UI around it.

Usage:
    python main.py             Build dist/ if missing, then launch.
    python main.py --rebuild   Force a fresh `npm run build` first.
    python main.py --dev       Point the window at the Vite dev server
                                (run `npm run dev` yourself first) -
                                for iterating on the UI with hot reload
                                while still seeing it in the native shell.

Note on unsaved-changes-on-close: the app's own File > Exit menu item
still asks for confirmation (it calls the same window.confirm() dialog
it always has). Closing the native window directly via its OS-level
close button does not - pywebview does not guarantee it honors the
page's beforeunload handler the way a real browser tab does. This is a
known limitation of wrapping a web app this way, not a bug in the
editor itself; ask if you want this closed by wiring a small bridge
between pywebview's own window-closing event and the store's isDirty
flag.
"""

import functools
import http.server
import shutil
import socket
import subprocess
import sys
import threading
from pathlib import Path

import webview

APP_TITLE = "EPW Synoptic Editor"
ROOT_DIR = Path(__file__).resolve().parent
DIST_DIR = ROOT_DIR / "dist"
DEV_SERVER_URL = "http://localhost:5173/"


def _npm_command() -> list[str]:
    # npm ships as npm.cmd on Windows - shutil.which resolves whichever
    # actual executable belongs to the platform this happens to run on.
    npm = shutil.which("npm")
    if not npm:
        print("[ERROR] npm was not found on PATH - install Node.js first (see README.md).")
        sys.exit(1)
    return [npm]


def build_frontend() -> None:
    print("[INFO] Building frontend (npm run build)...")
    result = subprocess.run(_npm_command() + ["run", "build"], cwd=ROOT_DIR)
    if result.returncode != 0:
        print("[ERROR] npm run build failed - see output above.")
        sys.exit(1)


def _free_port() -> int:
    # Bind to port 0 so the OS hands back an unused ephemeral port, then
    # release it immediately. The tiny window between this and the real
    # server binding the same port is the same race every "find a free
    # port" helper accepts - harmless here (loopback-only, one process).
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def serve_dist(port: int) -> None:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DIST_DIR))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    # Daemon thread: dies with the main process the instant the pywebview
    # window closes, with nothing else to shut down explicitly.
    threading.Thread(target=server.serve_forever, daemon=True).start()


def main() -> int:
    args = sys.argv[1:]
    dev_mode = "--dev" in args
    force_rebuild = "--rebuild" in args

    if dev_mode:
        url = DEV_SERVER_URL
        print(f"[INFO] Dev mode - pointing the window at {url} (run 'npm run dev' yourself first).")
    else:
        if force_rebuild or not (DIST_DIR / "index.html").exists():
            build_frontend()
        port = _free_port()
        serve_dist(port)
        url = f"http://127.0.0.1:{port}/"
        print(f"[INFO] Serving {DIST_DIR} at {url}")

    webview.create_window(APP_TITLE, url, width=1600, height=900, min_size=(1024, 700))
    webview.start()
    return 0


if __name__ == "__main__":
    sys.exit(main())
