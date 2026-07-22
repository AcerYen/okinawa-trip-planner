# -*- coding: utf-8 -*-
"""Fix multiline description/tips and pad to 150-200 chars."""
import re
from pathlib import Path

DESC_PADS = [
    "帶 1.5 歲幼兒與懷孕 4 個月的家庭，可依當天體力彈性調整停留時間，累了就縮短不必勉強。",
    "9–10 月紫外線仍強、午後易悶熱，建議防曬補水，並預留回飯店或車上吹冷氣的緩衝。",
]
TIPS_PADS = [
    "出發前可再查 Google 地圖或官網，確認營業時間、公休日與最新評價，避免白跑一趟。",
    "若當天已排較多行程，此站可視體力縮短或改為選配，以午睡與休息優先。",
]


def fit_length(text: str, pads: list[str], lo: int = 150, hi: int = 200) -> str:
    t = text.strip()
    if len(t) > hi:
        while len(t) > hi and "。" in t[:-1]:
            t = t.rsplit("。", 1)[0] + "。"
        if len(t) > hi:
            t = t[: hi - 1] + "…"
        return t
    if len(t) >= lo:
        return t
    combo = t
    for pad in pads:
        combo += pad
        if lo <= len(combo) <= hi:
            return combo
    return (combo + pads[-1])[:hi]


def read_quoted_field(block: str, field: str) -> tuple[str, str, str]:
    """Return (before, value, after) for description or tips field."""
    m = re.search(rf"({field}:\s*)([\s\S]*?)(\n\s*tips:|\n\s*cost:)", block)
    if not m:
        raise ValueError(f"field {field} not found")
    prefix, raw, suffix_marker = m.group(1), m.group(2), m.group(3)

    raw = raw.strip()
    if raw.startswith("'") and raw.endswith("'"):
        val = raw[1:-1].replace("\\'", "'")
    elif raw.startswith("'"):
        # multiline concatenation
        parts = re.findall(r"'((?:\\'|[^'])*)'", raw)
        val = "".join(p.replace("\\'", "'") for p in parts)
    else:
        raise ValueError(f"unexpected {field} format")
    return prefix, val, suffix_marker


def set_fields(block: str, desc: str, tips: str) -> str:
    block = re.sub(
        r"description:\s*[\s\S]*?\n(\s*tips:)\s*[\s\S]*?\n(\s*cost:)",
        lambda m: f"description: '{desc}',\n    tips: '{tips}',\n    cost:",
        block,
        count=1,
    )
    return block


def main() -> None:
    path = Path("src/data/okinawa.ts")
    text = path.read_text(encoding="utf-8")
    chunks = re.split(r"(?=\n  \{\n    id: ')", text)
    out = [chunks[0]]
    fixed = 0

    for chunk in chunks[1:]:
        if "description:" not in chunk:
            out.append(chunk)
            continue
        pid_m = re.match(r"\n  \{\n    id: '([^']+)'", chunk)
        pid = pid_m.group(1) if pid_m else "?"
        try:
            _, desc, _ = read_quoted_field(chunk, "description")
            _, tips, _ = read_quoted_field(chunk, "tips")
        except ValueError:
            out.append(chunk)
            continue
        desc2 = fit_length(desc, DESC_PADS)
        tips2 = fit_length(tips, TIPS_PADS)
        if desc2 != desc or tips2 != tips or "description:\n" in chunk:
            chunk = set_fields(
                chunk,
                desc2.replace("'", "\\'"),
                tips2.replace("'", "\\'"),
            )
            fixed += 1
        out.append(chunk)

    path.write_text("".join(out), encoding="utf-8")
    print(f"Fixed {fixed} blocks")


if __name__ == "__main__":
    main()
