# -*- coding: utf-8 -*-
"""Deduplicate sentences and ensure 150-200 chars."""
import re
from pathlib import Path

REPLACEMENTS = {"补水": "補水", "充满": "充滿", "经典": "經典"}

FILLERS = [
    "記得備足飲水、防曬與濕紙巾，讓旅途更從容順利。",
    "推車與揹巾建議都帶，依階梯與路況靈活切換。",
    "可依當天體力縮短停留，以寶寶午睡與媽媽休息為優先。",
]


def dedupe_sentences(text: str) -> str:
    for a, b in REPLACEMENTS.items():
        text = text.replace(a, b)
    parts = [p.strip() for p in text.split("。") if p.strip()]
    seen = set()
    out = []
    for p in parts:
        if p in seen:
            continue
        seen.add(p)
        out.append(p)
    return "。".join(out) + ("。" if out else "")


def fit(text: str, lo: int = 150, hi: int = 200) -> str:
    t = dedupe_sentences(text)
    if len(t) > hi:
        parts = [p for p in t.split("。") if p]
        while parts and len("。".join(parts) + "。") > hi:
            parts.pop()
        t = "。".join(parts) + "。"
    for filler in FILLERS:
        if len(t) >= lo:
            break
        candidate = (t.rstrip("。") + "。" + filler) if t else filler
        if len(candidate) <= hi:
            t = candidate
    t = dedupe_sentences(t)
    fi = 0
    while len(t) < lo and fi < len(FILLERS) * 2:
        extra = FILLERS[fi % len(FILLERS)]
        t = (t.rstrip("。") + "。" + extra) if t else extra
        t = dedupe_sentences(t)
        fi += 1
    if len(t) < lo:
        t = (t.rstrip("。") + "。出發前建議再確認營業時間、交通與最新評價。")[:hi]
    if len(t) > hi:
        t = t[: hi - 1] + "…"
    return t


def main() -> None:
    path = Path("src/data/okinawa.ts")
    text = path.read_text(encoding="utf-8")
    chunks = re.split(r"(?=\n  \{\n    id: ')", text)
    out = [chunks[0]]
    n = 0

    for chunk in chunks[1:]:
        m = re.search(
            r"description: '((?:\\'|[^'])*)',\s*\n\s*tips: '((?:\\'|[^'])*)',",
            chunk,
        )
        if not m:
            out.append(chunk)
            continue
        desc = m.group(1).replace("\\'", "'")
        tips = m.group(2).replace("\\'", "'")
        desc2 = fit(desc)
        tips2 = fit(tips)
        esc = lambda s: s.replace("'", "\\'")
        chunk2 = chunk.replace(
            m.group(0),
            f"description: '{esc(desc2)}',\n    tips: '{esc(tips2)}',",
            1,
        )
        out.append(chunk2)
        n += 1

    path.write_text("".join(out), encoding="utf-8")
    print(f"Cleaned {n} entries")


if __name__ == "__main__":
    main()
