#!/usr/bin/env python3
"""Key a Figma frame's flat background fill out of a preview PNG.

The thumbnails on the Figma "Handoff site" page are 960x720 frames with a flat fill
behind the composition — #F5F5F5 on the screen thumbnails, #F5F6FA on the two title
cards. Exporting a frame bakes that fill in, and an opaque thumbnail hides the tint
gradient the card draws behind it (see `src/components/work-card.tsx`). Running an export
through this script makes the fill transparent, so the composition floats on the tint the
way `remedy-chat-core.png` does.

    python3 scripts/key-preview-background.py public/previews/rx-refills.png

Only the fill CONNECTED to the frame's border is keyed, so a white card or chat bubble
inside the composition keeps its background. That is the wrong rule for a frame whose art
is type: the counters inside a letterform are the fill colour too, and being enclosed they
survive, then show as pale blobs inside the letters once the panel behind them is not the
same colour. Pass `--enclosed` for those, which keys every pixel of the fill wherever it
sits:

    python3 scripts/key-preview-background.py --enclosed public/previews/remedy-v1-0-handoff.png

Only safe when nothing in the composition legitimately uses the fill colour — true of the
title cards, false of a screenshot full of near-white UI. Cards whose background is artwork rather
than a flat fill — the red gradient title cards, `accessibility-audit` — are meant to
stay opaque; don't run this on them (it would no-op anyway, since their border pixels are
a gradient rather than one flat colour).

Standard library only, like `generate-content.py`: an 8-bit PNG is a zlib stream of
filtered scanlines, and `zlib` + `struct` are enough to rewrite one.
"""

from __future__ import annotations

import struct
import sys
import zlib
from collections import deque
from pathlib import Path

# How far a pixel may drift from the corner colour and still count as the fill, summed
# across the three channels. Figma's exports are flat to the byte, so this only has to
# absorb the odd rounding artefact; keeping it tight is what stops the key leaking out of
# the fill and into the near-white cards and bubbles sitting on it.
TOLERANCE = 6

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def read_png(path: Path) -> tuple[int, int, bytearray]:
    """Decode an 8-bit RGB/RGBA PNG to (width, height, RGBA bytes)."""
    data = path.read_bytes()
    if data[:8] != PNG_SIGNATURE:
        raise SystemExit(f"{path}: not a PNG")

    chunks: dict[bytes, bytes] = {}
    idat = bytearray()
    offset = 8
    while offset < len(data):
        (length,) = struct.unpack(">I", data[offset : offset + 4])
        kind = data[offset + 4 : offset + 8]
        payload = data[offset + 8 : offset + 8 + length]
        if kind == b"IDAT":
            idat += payload
        else:
            chunks[kind] = payload
        offset += 12 + length

    width, height, depth, colour, _, _, interlace = struct.unpack(">IIBBBBB", chunks[b"IHDR"])
    if depth != 8 or colour not in (2, 6) or interlace != 0:
        raise SystemExit(
            f"{path}: expected a non-interlaced 8-bit RGB/RGBA PNG "
            f"(got depth={depth}, colour type={colour}, interlace={interlace})"
        )

    channels = 4 if colour == 6 else 3
    stride = width * channels
    raw = zlib.decompress(bytes(idat))

    # Undo the per-scanline filters. Each scanline is prefixed with its filter type and
    # predicts from the pixel to the left (a) and the scanline above (b, c = above-left).
    out = bytearray(height * stride)
    previous = bytearray(stride)
    pos = 0
    for y in range(height):
        filter_type = raw[pos]
        line = bytearray(raw[pos + 1 : pos + 1 + stride])
        pos += 1 + stride
        for i in range(stride):
            a = line[i - channels] if i >= channels else 0
            b = previous[i]
            c = previous[i - channels] if i >= channels else 0
            if filter_type == 0:
                value = line[i]
            elif filter_type == 1:
                value = line[i] + a
            elif filter_type == 2:
                value = line[i] + b
            elif filter_type == 3:
                value = line[i] + (a + b) // 2
            elif filter_type == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                value = line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)
            else:
                raise SystemExit(f"{path}: unknown scanline filter {filter_type}")
            line[i] = value & 0xFF
        out[y * stride : (y + 1) * stride] = line
        previous = line

    if channels == 3:  # Promote RGB to RGBA so there is an alpha channel to key.
        rgba = bytearray(width * height * 4)
        for i in range(width * height):
            rgba[i * 4 : i * 4 + 3] = out[i * 3 : i * 3 + 3]
            rgba[i * 4 + 3] = 255
        out = rgba

    return width, height, out


def write_png(path: Path, width: int, height: int, pixels: bytearray) -> None:
    """Encode RGBA bytes as an unfiltered 8-bit RGBA PNG."""
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw += b"\x00" + pixels[y * stride : (y + 1) * stride]

    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    path.write_bytes(
        PNG_SIGNATURE
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def key_background(path: Path, tolerance: int = TOLERANCE, enclosed: bool = False) -> float:
    """Make the fill transparent. Returns the percentage keyed."""
    width, height, pixels = read_png(path)
    fill = pixels[0:3]

    def is_fill(index: int) -> bool:
        base = index * 4
        return sum(abs(pixels[base + c] - fill[c]) for c in range(3)) <= tolerance

    if enclosed:
        # Every pixel of the fill, connected to the border or not.
        keyed = 0
        for index in range(width * height):
            if is_fill(index):
                pixels[index * 4 + 3] = 0
                keyed += 1
        write_png(path, width, height, pixels)
        return 100 * keyed / (width * height)

    # Flood fill inward from every border pixel that still matches, so a composition
    # touching one edge cannot strand fill on the far side of it.
    seen = bytearray(width * height)
    queue: deque[int] = deque()
    for x in range(width):
        queue.extend((x, (height - 1) * width + x))
    for y in range(height):
        queue.extend((y * width, y * width + width - 1))

    keyed = 0
    while queue:
        index = queue.popleft()
        if seen[index] or not is_fill(index):
            continue
        seen[index] = 1
        pixels[index * 4 + 3] = 0
        keyed += 1
        x, y = index % width, index // width
        if x > 0:
            queue.append(index - 1)
        if x < width - 1:
            queue.append(index + 1)
        if y > 0:
            queue.append(index - width)
        if y < height - 1:
            queue.append(index + width)

    write_png(path, width, height, pixels)
    return 100 * keyed / (width * height)


def main(argv: list[str]) -> int:
    arguments = argv[1:]
    enclosed = "--enclosed" in arguments
    paths = [Path(arg) for arg in arguments if not arg.startswith("--")]
    if not paths:
        print(__doc__)
        return 1
    for path in paths:
        percentage = key_background(path, enclosed=enclosed)
        print(f"{path.name}: keyed {percentage:.1f}% of the frame")
        if percentage < 1:
            print("  (almost nothing keyed — is this frame's background artwork?)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
