# -*- coding: utf-8 -*-
"""Trim description/tips to ~4 lines (~96 chars) at sentence boundaries."""
import re
from pathlib import Path

MAX_LEN = 96


def trim(text: str, max_len: int = MAX_LEN) -> str:
    t = text.strip()
    # remove repetitive boilerplate sentences
    boiler = [
        "整體節奏以悠閒安全為主，依寶寶與媽媽體力彈性調整即可。",
        "記得備足飲水、防曬與濕紙巾，讓旅途更從容順利。",
        "推車與揹巾建議都帶，依階梯與路況靈活切換。",
        "出發前建議再確認營業時間與最新評價。",
        "可依當天體力縮短停留，以寶寶午睡與媽媽休息為優先。",
        "建議依當天體力與寶寶作息彈性安排，以休息優先、開心出遊最重要。",
    ]
    for b in boiler:
        t = t.replace(b, "")
    t = t.strip()
    if len(t) <= max_len:
        return t
    parts = [p for p in t.split("。") if p.strip()]
    out = []
    for p in parts:
        candidate = "。".join(out + [p]) + "。"
        if len(candidate) <= max_len:
            out.append(p)
        else:
            break
    if out:
        return "。".join(out) + "。"
    return t[: max_len - 1] + "…"


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
        if m:
            desc = trim(m.group(1).replace("\\'", "'"))
            tips = trim(m.group(2).replace("\\'", "'"))
            esc = lambda s: s.replace("'", "\\'")
            chunk = chunk.replace(
                m.group(0),
                f"description: '{esc(desc)}',\n    tips: '{esc(tips)}',",
                1,
            )
            n += 1
        out.append(chunk)
    path.write_text("".join(out), encoding="utf-8")
    print(f"Trimmed {n} entries to ~{MAX_LEN} chars")


if __name__ == "__main__":
    main()
