# -*- coding: utf-8 -*-
import re, sys
sys.stdout.reconfigure(encoding='utf-8')
t = open('src/data/okinawa.ts', encoding='utf-8').read()
ids = re.findall(r"id: '([^']+)'", t)
# only attraction ids (before packingList etc)
for i in ids:
    print(i)
print('count', len(ids))
