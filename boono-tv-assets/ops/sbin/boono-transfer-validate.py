#!/usr/bin/env python3
"""
BOONO visual transfer preflight.
No writes to runtime, Git, or BOONO-TV. It only inspects one immutable upload
and emits a JSON receipt to stdout.
"""
from __future__ import annotations
from pathlib import Path, PurePosixPath
from PIL import Image, UnidentifiedImageError
from io import BytesIO
import hashlib, json, stat, sys, zipfile

MAX_UPLOAD = 2 * 1024**3          # 2 GiB compressed/single file
MAX_ZIP_FILES = 5000
MAX_ZIP_TOTAL = 8 * 1024**3       # 8 GiB uncompressed
MAX_ZIP_MEMBER = 256 * 1024**2    # 256 MiB per member
MAX_DIM = 8192
MAX_PIXELS = 70_000_000
IMAGE_EXT = {".png", ".webp", ".jpg", ".jpeg"}
ZIP_TEXT_EXT = {".json", ".txt", ".md"}
ALLOWED_ZIP_EXT = IMAGE_EXT | ZIP_TEXT_EXT
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

def sha256_path(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for block in iter(lambda: f.read(4 * 1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def check_rel(name: str) -> PurePosixPath:
    if "\x00" in name:
        raise ValueError("NUL byte in archive path")
    q = PurePosixPath(name)
    if q.is_absolute() or ".." in q.parts:
        raise ValueError(f"unsafe archive path: {name}")
    if not q.parts:
        raise ValueError("empty archive path")
    return q

def inspect_image_bytes(data: bytes, label: str) -> dict:
    try:
        with Image.open(BytesIO(data)) as im:
            fmt = im.format
            frames = getattr(im, "n_frames", 1)
            w, h = im.size
            if frames != 1:
                raise ValueError(f"animated image rejected: {label} ({frames} frames)")
            if not (1 <= w <= MAX_DIM and 1 <= h <= MAX_DIM and w * h <= MAX_PIXELS):
                raise ValueError(f"image dimensions rejected: {label} {w}x{h}")
            im.verify()
        with Image.open(BytesIO(data)) as im:
            im.load()
            mode = im.mode
        return {"format": fmt, "width": w, "height": h, "mode": mode}
    except (UnidentifiedImageError, OSError) as e:
        raise ValueError(f"invalid image {label}: {e}") from e

def inspect_image_path(p: Path) -> dict:
    if p.stat().st_size > MAX_UPLOAD:
        raise ValueError("file exceeds 2 GiB")
    return inspect_image_bytes(p.read_bytes(), p.name)

def inspect_zip(p: Path) -> tuple[dict, str]:
    entries = []
    total = 0
    images = 0
    names = set()
    package = None
    with zipfile.ZipFile(p, "r") as z:
        infos = z.infolist()
        if len(infos) > MAX_ZIP_FILES:
            raise ValueError(f"archive has {len(infos)} entries; max {MAX_ZIP_FILES}")
        for zi in infos:
            q = check_rel(zi.filename)
            if zi.is_dir():
                continue
            mode = (zi.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(mode):
                raise ValueError(f"symlink rejected in archive: {zi.filename}")
            if zi.flag_bits & 0x1:
                raise ValueError(f"encrypted member rejected: {zi.filename}")
            if zi.file_size > MAX_ZIP_MEMBER:
                raise ValueError(f"archive member too large: {zi.filename}")
            total += zi.file_size
            if total > MAX_ZIP_TOTAL:
                raise ValueError("archive uncompressed total exceeds 8 GiB")
            ext = q.suffix.lower()
            if ext not in ALLOWED_ZIP_EXT:
                raise ValueError(f"unsupported archive member type: {zi.filename}")
            key = q.as_posix()
            if key in names:
                raise ValueError(f"duplicate archive path: {key}")
            names.add(key)
            raw = z.read(zi)
            meta = {
                "path": key,
                "bytes": zi.file_size,
                "sha256": hashlib.sha256(raw).hexdigest(),
            }
            if ext in IMAGE_EXT:
                meta.update(inspect_image_bytes(raw, key))
                images += 1
            elif q.name == "boono-package.json":
                package = json.loads(raw.decode("utf-8"))
            entries.append(meta)
        bad = z.testzip()
        if bad:
            raise ValueError(f"CRC failure in archive member: {bad}")
    legacy = {
        "boono_room_backplate_1200x1080.webp",
        "boono_desk_foreground_1200x1080.webp",
        *{f"boono_{s}_1200x1080.webp" for s in
          ["working","thinking","worried","concentrated","confident","observe","execute"]},
    }
    basenames = {PurePosixPath(x).name for x in names}
    if package:
        kind = str(package.get("kind") or "visual-bundle-v1")
    elif legacy.issubset(basenames):
        kind = "layered-runtime-v1"
    else:
        kind = "visual-bundle-v1"
    return {
        "entries": len(entries),
        "images": images,
        "uncompressed_bytes": total,
        "members": entries,
        "package": package,
    }, kind

def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: boono-transfer-validate.py FILE")
    p = Path(sys.argv[1]).resolve()
    if not p.exists() or not p.is_file() or p.is_symlink():
        raise SystemExit("upload must be a regular file")
    size = p.stat().st_size
    if size <= 0 or size > MAX_UPLOAD:
        raise SystemExit(f"invalid upload size: {size}")
    ext = p.suffix.lower()
    receipt = {
        "schema": 1,
        "filename": p.name,
        "bytes": size,
        "sha256": sha256_path(p),
    }
    if ext in IMAGE_EXT:
        receipt["image"] = inspect_image_path(p)
        receipt["kind"] = "scene-board-v1" if "BOONOTV01" in p.name.upper() else "visual-source-v1"
    elif ext == ".zip":
        zmeta, kind = inspect_zip(p)
        receipt["zip"] = zmeta
        receipt["kind"] = kind
    else:
        raise SystemExit(f"unsupported upload type: {ext}")
    print(json.dumps(receipt, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"schema":1,"ok":False,"error":str(e)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(2)
