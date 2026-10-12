#!/usr/bin/env python3
"""Package an already-built extension; never include source or private records."""
import argparse
import fnmatch
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / "extension"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("output", type=Path, help="Output directory outside the extension folder")
args = parser.parse_args()
destination = args.output.expanduser().resolve()
if destination == EXT or EXT in destination.parents:
    parser.error("Output must be outside the extension folder")

manifest = json.loads((EXT / "manifest.json").read_text())
files = {}

def include(relative):
    path = EXT / relative
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"Missing or unsafe release file: {relative}")
    files[relative] = path.read_bytes()

for relative in (
    "manifest.json", "loopy_goopy_full.png", "loopy_goopy_128.png",
    "runtime/background.js", "runtime/practice.js", "runtime/migrationDocument.js",
    "runtime/migrate.html", "app/src/app/LoopyGoopy/contentScript.js",
    "app/src/app/LoopyGoopy/pagePlaybackBridge.js",
):
    include(relative)

include("app/build/index.html")
for path in sorted((EXT / "app/build").rglob("*")):
    if path.is_file() and path.suffix != ".map":
        include(path.relative_to(EXT).as_posix())
files["licenses/ComicRelief-OFL.txt"] = (EXT / "app/src/practice/fonts/OFL.txt").read_bytes()

# Verify every manifest entry and the generated HTML/CSS asset references.
references = [manifest["background"]["service_worker"], manifest["action"]["default_popup"]]
references += list(manifest["icons"].values())
icon = manifest["action"]["default_icon"]
references += [icon] if isinstance(icon, str) else list(icon.values())
for script in manifest["content_scripts"]:
    references += script.get("js", []) + script.get("css", [])
for group in manifest["web_accessible_resources"]:
    references += group["resources"]
for reference in references:
    if not any(fnmatch.fnmatch(name, reference) for name in files):
        raise ValueError(f"Unpackaged manifest asset: {reference}")
for name, content in files.items():
    if name.endswith((".html", ".css")):
        for reference in re.findall(r'''(?:src|href)=["']([^"']+)|url\(["']?([^)'"\s]+)''', content.decode()):
            target = next(value for value in reference if value)
            if target.startswith(("data:", "http:", "https:", "#")):
                continue
            target = target.split("?")[0].split("#")[0]
            resolved = (EXT / target.lstrip("/")) if target.startswith("/") else (EXT / name).parent / target
            relative = resolved.resolve().relative_to(EXT).as_posix()
            if relative not in files:
                raise ValueError(f"Unpackaged asset {target} in {name}")

destination.mkdir(parents=True, exist_ok=True)
archive = destination / f"loopy-goopy-{manifest['version']}.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for name, content in sorted(files.items()):
        entry = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        bundle.writestr(entry, content)
with zipfile.ZipFile(archive) as bundle:
    if bundle.testzip() is not None:
        raise ValueError("ZIP integrity check failed")
    assert json.loads(bundle.read("manifest.json"))["version"] == manifest["version"]
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(destination / f"{archive.name}.sha256").write_text(f"{digest}  {archive.name}\n")
(destination / "package-files.txt").write_text("\n".join(sorted(files)) + "\n")
print(f"{archive}\n{len(files)} files; {archive.stat().st_size:,} bytes\nSHA256 {digest}")
