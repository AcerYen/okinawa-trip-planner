# -*- coding: utf-8 -*-
"""Pad place copy to 150-200 chars per field."""
import re
from pathlib import Path

DESC_PADS = [
    "帶 1.5 歲幼兒與懷孕 4 個月的家庭，可依當天體力彈性調整停留時間，累了就縮短不必勉強。",
    "9–10 月紫外線仍強、午後易悶熱，建議防曬補水，並預留回飯店或車上吹冷氣的緩衝。",
    "推車與揹巾建議都帶，階梯多時換揹巾會輕鬆許多，也能讓寶寶更接近父母。",
]

TIPS_PADS = [
    "出發前可再查 Google 地圖或官網，確認營業時間、公休日與最新評價，避免白跑一趟。",
    "若當天已排較多行程，此站可視體力縮短或改為選配，以午睡與休息優先。",
    "記得替幼兒備替換衣物、濕紙巾與小零食，讓臨時狀況更好應對。",
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
    for pad in pads:
        for combo in (t + pad, t + pad + "整體節奏以悠閒為主。"):
            if lo <= len(combo) <= hi:
                return combo
    combo = t
    for pad in pads:
        combo += pad
        if len(combo) >= lo:
            return combo[:hi]
    return (combo + "建議出發前再次確認最新資訊。")[:hi]


def main() -> None:
    path = Path("src/data/okinawa.ts")
    text = path.read_text(encoding="utf-8")

    def repl_block(m: re.Match[str]) -> str:
        prefix, desc, mid, tips, suffix = m.groups()
        desc2 = fit_length(desc, DESC_PADS)
        tips2 = fit_length(tips, TIPS_PADS)
        return f"{prefix}'{desc2}'{mid}'{tips2}'{suffix}"

    pattern = (
        r"(id: '[^']+'[\s\S]*?description: )'"
        r"([^']*)'"
        r"(\s*,\s*\n\s*tips: )'"
        r"([^']*)'"
        r"(\s*,\s*\n\s*cost:)"
    )
    new_text, n = re.subn(pattern, repl_block, text)
    path.write_text(new_text, encoding="utf-8")

    blocks = re.findall(
        r"id: '([^']+)'[\s\S]*?description: '([^']*)'[\s\S]*?tips: '([^']*)'",
        new_text,
    )
    issues = []
    for pid, d, t in blocks:
        if not (150 <= len(d) <= 200):
            issues.append(f"{pid}.desc={len(d)}")
        if not (150 <= len(t) <= 200):
            issues.append(f"{pid}.tips={len(t)}")
    print(f"Patched {n} blocks, {len(blocks)} total")
    if issues:
        print("Still off target:")
        for i in issues:
            print(" ", i)
    else:
        print("All fields 150-200 chars")


if __name__ == "__main__":
    main()
