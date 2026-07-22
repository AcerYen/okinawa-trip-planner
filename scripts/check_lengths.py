# -*- coding: utf-8 -*-
"""Check current description/tips lengths."""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')
text = open('src/data/okinawa.ts', encoding='utf-8').read()
chunks = re.split(r"(?=\n  \{\n    id: ')", text)
ids = []
for chunk in chunks[1:]:
    m = re.match(r"\n  \{\n    id: '([^']+)'", chunk)
    if not m: continue
    pid = m.group(1)
    dm = re.search(r"description: '((?:\\'|[^'])*)'", chunk)
    tm = re.search(r"tips: '((?:\\'|[^'])*)'", chunk)
    if not dm or not tm: continue
    d = dm.group(1).replace("\\'", "'")
    t = tm.group(1).replace("\\'", "'")
    ids.append((pid, len(d), len(t), d, t))
print(f'total {len(ids)}')
print('sample:')
for pid, ld, lt, d, t in ids[:3]:
    print(f'  {pid}: d={ld} t={lt}')
print('avg d', sum(x[1] for x in ids)/len(ids))
print('avg t', sum(x[2] for x in ids)/len(ids))
