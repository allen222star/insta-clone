"""ANNAgram PWA PNG icons (no extra deps)."""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "icons"


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))


def gradient_at(x: float, y: float, n: int):
    t = (x + (n - 1 - y)) / (2 * (n - 1))
    if t < 0.5:
        return mix((245, 133, 41), (221, 42, 123), t * 2)
    return mix((221, 42, 123), (129, 52, 175), (t - 0.5) * 2)


def rounded_rect(px, py, n, pad, radius):
    x0, y0, x1, y1 = pad, pad, n - 1 - pad, n - 1 - pad
    if px < x0 or px > x1 or py < y0 or py > y1:
        return False
    corners = (
        (x0 + radius, y0 + radius, px < x0 + radius and py < y0 + radius),
        (x1 - radius, y0 + radius, px > x1 - radius and py < y0 + radius),
        (x0 + radius, y1 - radius, px < x0 + radius and py > y1 - radius),
        (x1 - radius, y1 - radius, px > x1 - radius and py > y1 - radius),
    )
    for cx, cy, hit in corners:
        if hit and (px - cx) ** 2 + (py - cy) ** 2 > radius ** 2:
            return False
    return True


def ring(px, py, cx, cy, r, w):
    d = math.hypot(px - cx, py - cy)
    return abs(d - r) <= w / 2


def paint(n: int) -> bytes:
    s = n / 32.0
    cx = cy = 16 * s
    rows = []
    for y in range(n):
        row = bytearray()
        for x in range(n):
            inside = rounded_rect(x, y, n, 0, int(8 * s))
            if not inside:
                row += bytes((0, 0, 0, 0))
                continue
            r, g, b = gradient_at(x, y, n)
            px, py = x + 0.5, y + 0.5
            stroke = max(1.6, 2.0 * s)
            cam = (
                rounded_rect(x, y, n, int(7 * s), int(5 * s))
                and not rounded_rect(x, y, n, int(7 * s + stroke), int(max(1, 5 * s - stroke)))
            )
            lens = ring(px, py, cx, cy, 4.5 * s, stroke)
            dot = math.hypot(px - 21.5 * s, py - 10.5 * s) <= 1.3 * s
            if cam or lens or dot:
                row += bytes((255, 255, 255, 255))
            else:
                row += bytes((r, g, b, 255))
        rows.append(b"\x00" + bytes(row))
    return b"".join(rows)


def png(raw: bytes, n: int) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size in (("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)):
        (OUT / name).write_bytes(png(paint(size), size))
        print("wrote", OUT / name)


if __name__ == "__main__":
    main()
