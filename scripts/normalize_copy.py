# -*- coding: utf-8 -*-
"""Normalize copy: 150-200 chars, remove duplicate generic padding."""
import re
from pathlib import Path

GENERIC_DESC = "帶 1.5 歲幼兒與懷孕 4 個月的家庭，可依當天體力彈性調整停留時間，累了就縮短不必勉強。"
GENERIC_TIPS = "出發前可再查 Google 地圖或官網，確認營業時間、公休日與最新評價，避免白跑一趟。"

REPLACEMENTS = {"补水": "補水", "充满": "充滿", "经典": "經典"}


def clean(text: str) -> str:
    for a, b in REPLACEMENTS.items():
        text = text.replace(a, b)
    while GENERIC_DESC in text:
        text = text.replace(GENERIC_DESC, "")
    while GENERIC_TIPS in text:
        text = text.replace(GENERIC_TIPS, "")
    return text.strip()


FILLERS = [
    "行程可彈性縮短，以寶寶午睡與媽媽休息為優先。",
    "記得備足飲水、防曬與濕紙巾，讓旅途更從容。",
    "推車與揹巾建議都帶，依路況靈活切換。",
]


def fit(text: str, lo: int = 150, hi: int = 200) -> str:
    t = clean(text)
    if len(t) > hi:
        while len(t) > hi and "。" in t[:-1]:
            t = t.rsplit("。", 1)[0] + "。"
        if len(t) > hi:
            t = t[: hi - 1] + "…"
    i = 0
    while len(t) < lo and i < len(FILLERS):
        t += FILLERS[i]
        i += 1
    if len(t) < lo:
        t += "整體以悠閒、安全、休息優先。" 
    return t[:hi]


def main() -> None:
    path = Path("src/data/okinawa.ts")
    text = path.read_text(encoding="utf-8")
    chunks = re.split(r"(?=\n  \{\n    id: ')", text)
    out = [chunks[0]]
    n = 0

    for chunk in chunks[1:]:
        if "description:" not in chunk:
            out.append(chunk)
            continue

        def repl(m: re.Match[str]) -> str:
            nonlocal n
            desc = m.group(1).replace("\\'", "'")
            tips = m.group(2).replace("\\'", "'")
            desc2 = fit(desc)
            tips2 = fit(tips)
            n += 1
            return (
                f"description: '{desc2.replace(chr(39), chr(92)+chr(39))}',"
                f"\n    tips: '{tips2.replace(chr(39), chr(92)+chr(39))}',"
            )

        chunk2 = re.sub(
            r"description: '((?:\\'|[^'])*)',\s*\n\s*tips: '((?:\\'|[^'])*)',",
            repl,
            chunk,
            count=1,
        )
        out.append(chunk2)

    path.write_text("".join(out), encoding="utf-8")
    print(f"Normalized {n} entries")


if __name__ == "__main__":
    main()
