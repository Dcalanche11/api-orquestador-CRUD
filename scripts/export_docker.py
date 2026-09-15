"""Construye paquetes Docker portables sin datos ni credenciales del equipo origen."""

import argparse
import gzip
import hashlib
import json
import re
import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def export(arch: str, version: str, output: Path):
    platform = f"linux/{arch}"
    destination = output / f"pdge-{version}-{arch}"
    destination.mkdir(parents=True, exist_ok=False)
    images = [f"pdge-api:{version}-{arch}", f"pdge-web:{version}-{arch}"]
    for directory, image in zip(("backend", "frontend"), images, strict=True):
        run(
            "docker",
            "buildx",
            "build",
            "--platform",
            platform,
            "--load",
            "--tag",
            image,
            str(ROOT / directory),
        )
    for source, target in (
        ("postgres:17-alpine", f"pdge-postgres:17-{arch}"),
        ("redis:7-alpine", f"pdge-redis:7-{arch}"),
    ):
        run("docker", "pull", "--platform", platform, source)
        run("docker", "image", "tag", source, target)
        images.append(target)
    raw = destination / "images.tar"
    run(
        "docker", "image", "save", "--platform", platform, "--output", str(raw), *images
    )
    with (
        raw.open("rb") as source,
        gzip.open(destination / "images.tar.gz", "wb", compresslevel=6) as target,
    ):
        shutil.copyfileobj(source, target)
    raw.unlink()
    for source in (ROOT / "packaging" / "portable").iterdir():
        content = (
            source.read_text().replace("@ARCH@", arch).replace("@VERSION@", version)
        )
        (destination / source.name).write_text(content, encoding="utf-8")
    metadata = {"version": version, "platform": platform, "images": images}
    (destination / "images.json").write_text(json.dumps(metadata, indent=2) + "\n")
    checksums = []
    for path in sorted(destination.iterdir()):
        with path.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        checksums.append(f"{digest}  {path.name}")
    (destination / "SHA256SUMS.txt").write_text("\n".join(checksums) + "\n")
    archive = destination.parent / f"{destination.name}.zip"
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_STORED) as zipped:
        for path in sorted(destination.iterdir()):
            zipped.write(path, arcname=f"{destination.name}/{path.name}")
    print(f"Paquete generado: {archive}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arch", choices=("amd64", "arm64", "both"), default="both")
    parser.add_argument("--version", default="1.0.0")
    parser.add_argument("--output", type=Path, default=ROOT / "exports")
    args = parser.parse_args()
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", args.version):
        parser.error("Use una versión numérica como 1.0.0.")
    args.output.mkdir(parents=True, exist_ok=True)
    for arch in ("arm64", "amd64") if args.arch == "both" else (args.arch,):
        export(arch, args.version, args.output.resolve())


if __name__ == "__main__":
    main()
