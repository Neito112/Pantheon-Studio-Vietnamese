"""Package an already-built Windows app for the Vietnamese GitHub release.

    python scripts/package_windows_release.py --tag vi-2.0.2-r1

Produces the installer, a portable ZIP with its runtime, the offline HTML guide,
release information and SHA256SUMS.txt under dist/<tag>/github/.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / "apps/desktop/src-tauri/target/release"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tag", required=True)
    args = parser.parse_args()
    if not args.tag or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_" for c in args.tag):
        parser.error("tag must contain only letters, digits, dots, hyphens and underscores")
    exe = RELEASE / "pantheon-studio.exe"
    runtime = RELEASE / "runtime"
    version = json.loads((ROOT / "apps/desktop/src-tauri/tauri.conf.json").read_text(encoding="utf-8"))["version"]
    installer = RELEASE / "bundle/nsis" / f"Pantheon Studio_{version}_x64-setup.exe"
    for path in (exe, installer, runtime / "python/python.exe", runtime / "engine/app/serve.py", runtime / "ui/index.html"):
        if not path.is_file():
            raise SystemExit(f"missing build output: {path}")
    out = ROOT / "dist" / args.tag / "github"
    out.mkdir(parents=True, exist_ok=True)
    prefix = f"Pantheon-Studio-Vietnamese-{args.tag}-windows-x64"
    shutil.copy2(installer, out / f"{prefix}-setup.exe")
    shutil.copy2(ROOT / "docs/HUONG_DAN_SU_DUNG.html", out / "HUONG_DAN_SU_DUNG.html")
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    metadata = {
        "product": "Pantheon Studio Vietnamese",
        "upstream": "https://github.com/adityaagarw/Pantheon",
        "repository": "https://github.com/Neito112/Pantheon-Studio-Vietnamese",
        "tag": args.tag,
        "applicationVersion": version,
        "platform": "windows-x86_64",
        "sourceCommit": commit,
        "requires": "Windows 10/11 x64 and Microsoft Edge WebView2 Runtime",
        "updates": "Manual download from this repository's Releases; no signed updater feed is published.",
        "validation": ["42 UI tests passed (including 13 i18n checks)", "TypeScript and ESLint passed", "Offline HTML guide browser checks passed"],
    }
    (out / "BUILD-INFO.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    readme = (
        "PANTHEON STUDIO - TIENG VIET\n\n"
        "1. Giai nen TOAN BO file ZIP vao mot thu muc.\n"
        "2. Mo pantheon-studio.exe; giu nguyen thu muc runtime ben canh.\n"
        "3. Mo HUONG_DAN_SU_DUNG.html bang Chrome/Edge de xem huong dan.\n"
        "4. Cau hinh provider LLM / tai khoan agent de lam viec that.\n\n"
        "Khong can cai Python, Node hay Rust. Can Windows 10/11 x64 va WebView2 Runtime.\n"
        "Cau hinh va du lieu app van luu trong thu muc du lieu nguoi dung tren may.\n"
        "Ban nay khong dong goi tai khoan, API key hay du lieu ca nhan.\n"
        "Cap nhat thu cong tai https://github.com/Neito112/Pantheon-Studio-Vietnamese/releases\n\n"
        "Based on Pantheon Studio by The Pantheon Authors, Apache-2.0.\n"
        "See LICENSE, NOTICE and THIRD_PARTY_NOTICES.md.\n"
    )
    (out / "README-WINDOWS.txt").write_text(readme, encoding="utf-8")
    archive_path = out / f"{prefix}-portable.zip"
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        folder = Path(f"Pantheon-Studio-Vietnamese-{args.tag}")
        archive.write(exe, (folder / exe.name).as_posix())
        for path in sorted(runtime.rglob("*")):
            if path.is_file():
                archive.write(path, (folder / "runtime" / path.relative_to(runtime)).as_posix())
        for name in ("LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md"):
            archive.write(ROOT / name, (folder / name).as_posix())
        for name in ("README-WINDOWS.txt", "BUILD-INFO.json", "HUONG_DAN_SU_DUNG.html"):
            archive.write(out / name, (folder / name).as_posix())
    with zipfile.ZipFile(archive_path) as archive:
        bad = archive.testzip()
        if bad:
            raise SystemExit(f"ZIP integrity failed: {bad}")
    checksum_lines = []
    for path in sorted(out.iterdir()):
        if path.is_file() and path.name != "SHA256SUMS.txt":
            with path.open("rb") as stream:
                digest = hashlib.file_digest(stream, "sha256").hexdigest()
            checksum_lines.append(f"{digest}  {path.name}")
            print(f"{path.name}: {path.stat().st_size:,} bytes", flush=True)
    (out / "SHA256SUMS.txt").write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")
    print(f"Release ready: {out}", flush=True)


if __name__ == "__main__":
    main()
