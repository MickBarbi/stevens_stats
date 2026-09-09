"""Upload data/photos/*  ->  Cloudinary, with the TFRRS id as the public_id.

    python photos_upload.py                    # upload everything in data/photos/
    python photos_upload.py --dry-run          # list what would happen
    python photos_upload.py --only 8919566,9251050

Credentials come from ../.env (or the real environment):
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   (or CLOUDINARY_CLOUD_NAME)
    CLOUDINARY_API_KEY
    CLOUDINARY_API_SECRET

Each data/photos/<id>.<ext> is uploaded with public_id="<id>", overwrite=True,
invalidate=True -- so it replaces any existing photo for that athlete and the
CDN drops its cached copy. The athlete's name (from photos_manifest.csv, else
athletes.json) is stored as the Cloudinary display name + context caption/alt.

The site fetches res.cloudinary.com/<cloud>/image/upload/.../<id>, so no code
or data changes are needed once this runs.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
DATA_DIR = HERE / "data"
PHOTOS_DIR = DATA_DIR / "photos"
MANIFEST = DATA_DIR / "photos_manifest.csv"
ROOT = HERE.parent
ENV_FILE = ROOT / ".env"


def load_env(path: pathlib.Path) -> None:
    """Fill os.environ from a .env file for any key not already set."""
    if not path.exists():
        return
    for raw in path.read_text("utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key, val = key.strip(), val.strip().strip('"').strip("'")
        os.environ.setdefault(key, val)


def names_by_id() -> dict[int, str]:
    if MANIFEST.exists():
        with MANIFEST.open(encoding="utf-8") as fh:
            return {int(r["athlete_id"]): r["name"] for r in csv.DictReader(fh)}
    athletes = json.loads((ROOT / "data" / "athletes.json").read_text("utf-8"))
    return {a["athlete_id"]: f"{a['first_name']} {a['last_name']}" for a in athletes}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--dir", type=pathlib.Path, default=PHOTOS_DIR)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default="", help="comma-separated athlete ids")
    args = ap.parse_args(argv)

    load_env(ENV_FILE)
    cloud = os.environ.get("CLOUDINARY_CLOUD_NAME") or os.environ.get(
        "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
    )
    key = os.environ.get("CLOUDINARY_API_KEY")
    secret = os.environ.get("CLOUDINARY_API_SECRET")
    if not (cloud and key and secret):
        sys.exit(
            "missing Cloudinary credentials -- set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
        )

    files = sorted(
        p for p in args.dir.glob("*") if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
    )
    if args.only:
        want = {s.strip() for s in args.only.split(",") if s.strip()}
        files = [p for p in files if p.stem in want]
    if not files:
        sys.exit(f"no image files in {args.dir} (run photos.py first)")

    names = names_by_id()

    if args.dry_run:
        print(f"cloud '{cloud}' -- would upload {len(files)} file(s):")
        for p in files:
            print(f"  {p.name:18} -> public_id={p.stem:>9}  {names.get(int(p.stem), '?')}")
        return 0

    import cloudinary
    import cloudinary.api
    import cloudinary.uploader

    cloudinary.config(cloud_name=cloud, api_key=key, api_secret=secret, secure=True)
    try:
        cloudinary.api.ping()
    except Exception as exc:  # noqa: BLE001
        sys.exit(f"Cloudinary auth failed: {exc}")

    n_ok = n_fail = 0
    for p in files:
        aid = p.stem
        name = names.get(int(aid), "")
        opts = dict(
            public_id=aid,
            overwrite=True,
            invalidate=True,
            unique_filename=False,
            use_filename=False,
            resource_type="image",
            tags=["roster", "stevens-stats"],
            context={"caption": name, "alt": name} if name else None,
        )
        try:
            try:
                res = cloudinary.uploader.upload(str(p), display_name=name or None, **opts)
            except cloudinary.exceptions.Error as exc:
                if "display" not in str(exc).lower():
                    raise
                res = cloudinary.uploader.upload(str(p), **opts)  # env without display names
        except Exception as exc:  # noqa: BLE001
            print(f"  ! {aid} {name}: {exc}", file=sys.stderr)
            n_fail += 1
            continue
        kb = res.get("bytes", 0) / 1024
        print(f"  ok  {aid:>9}  {name:28.28}  {res.get('width')}x{res.get('height')}  {kb:5.0f} KB")
        n_ok += 1

    print(f"\nUploaded {n_ok}/{len(files)}" + (f", {n_fail} failed" if n_fail else ""))
    return 0 if not n_fail else 1


if __name__ == "__main__":
    raise SystemExit(main())
