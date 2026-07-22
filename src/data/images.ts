import type { Attraction, Category } from './okinawa'

const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?w=640&h=400&fit=crop&q=80&auto=format`

/** 圖片全部失效時的備援 */
export const FALLBACK_PLACE_IMAGE = IMG(
  'photo-1507525428034-b723cf961d3e'
)

/** 精選景點專屬圖（Unsplash） */
const BY_ID: Partial<Record<string, string>> = {
  churaumi: IMG('photo-1583212292454-1fe6229603b7'),
  'cape-manzamo': IMG('photo-1545569341-9eb8b30979d9'),
  'american-village': IMG('photo-1493976040374-85c8e12f0c0e'),
  'shuri-castle': IMG('photo-1493976040374-85c8e12f0c0e'),
  'kokusai-dori': IMG('photo-1441986300917-64674bd600d8'),
  'naminoue-beach': IMG('photo-1507525428034-b723cf961d3e'),
  'tropical-beach': IMG('photo-1559827260-dc66d52bef19'),
  'blue-cave': IMG('photo-1544551763-46a013bb70d5'),
  'kouri-island': IMG('photo-1507525428034-b723cf961d3e'),
  'sunset-beach': IMG('photo-1559827260-dc66d52bef19'),
  'senaga-island': IMG('photo-1439066615861-d1af74d74000'),
  steak88: IMG('photo-1544025162-d76694265947'),
  'burger-wolf': IMG('photo-1568901346375-23c9450c58cd'),
  hanapit: IMG('photo-1414235077428-338989a2e8c0'),
  'onigiri-shop': IMG('photo-1565299624946-b28f40a0ae38'),
  'menya-tondo': IMG('photo-1569718212165-3a8278d5f624'),
  hamaya: IMG('photo-1557872943-16a5ac26437e'),
  'churaumi-77': IMG('photo-1414235077428-338989a2e8c0'),
  poamoho: IMG('photo-1504674900247-0877df9cc836'),
  'aw-chatan': IMG('photo-1555939594-58d7cb561ad1'),
  'noboruya-ramen': IMG('photo-1569718212165-3a8278d5f624'),
  'calice-uno': IMG('photo-1414235077428-338989a2e8c0'),
  'tako-rice': IMG('photo-1565299585323-38d6b0865b47'),
  'neo-park': IMG('photo-1530549387789-4c1017266635'),
  'dino-park': IMG('photo-1506905925346-21bda4d32df4'),
  'okinawa-world': IMG('photo-1506905925346-21bda4d32df4'),
  zamami: IMG('photo-1559827260-dc66d52bef19'),
}

const BY_CATEGORY: Record<Category, string[]> = {
  beach: [
    IMG('photo-1507525428034-b723cf961d3e'),
    IMG('photo-1559827260-dc66d52bef19'),
    IMG('photo-1439066615861-d1af74d74000'),
  ],
  culture: [
    IMG('photo-1528164344705-47542687000d'),
    IMG('photo-1493976040374-85c8e12f0c0e'),
    IMG('photo-1480796927426-f609979314bd'),
  ],
  nature: [
    IMG('photo-1441974231531-c6227db76b6e'),
    IMG('photo-1506905925346-21bda4d32df4'),
    IMG('photo-1544551763-46a013bb70d5'),
  ],
  food: [
    IMG('photo-1555939594-58d7cb561ad1'),
    IMG('photo-1504674900247-0877df9cc836'),
    IMG('photo-1563805042-7684c019e1cb'),
  ],
  local: [
    IMG('photo-1557872943-16a5ac26437e'),
    IMG('photo-1569718212165-3a8278d5f624'),
    IMG('photo-1504674900247-0877df9cc836'),
    IMG('photo-1555939594-58d7cb561ad1'),
  ],
  fine: [
    IMG('photo-1414235077428-338989a2e8c0'),
    IMG('photo-1517248135467-4c7edcad34c4'),
    IMG('photo-1559339352-11d035aa65de'),
    IMG('photo-1544025162-d76694265947'),
  ],
  shopping: [
    IMG('photo-1441986300917-64674bd600d8'),
    IMG('photo-1472851294608-062f824d29cc'),
  ],
  family: [
    IMG('photo-1583212292454-1fe6229603b7'),
    IMG('photo-1530549387789-4c1017266635'),
    IMG('photo-1476514525535-07fb3b4ae5f1'),
  ],
  activity: [
    IMG('photo-1544551763-46a013bb70d5'),
    IMG('photo-1530549387789-4c1017266635'),
  ],
  hotel: [
    IMG('photo-1566073771259-6a8506099945'),
    IMG('photo-1582719508461-905c673771fd'),
    IMG('photo-1571896349842-33c89424de2d'),
    IMG('photo-1520250497591-112f2f40a3f4'),
  ],
}

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function getPlaceImage(place: Attraction): string {
  const specific = BY_ID[place.id]
  if (specific) return specific
  const pool = BY_CATEGORY[place.category]
  return pool[hashId(place.id) % pool.length]
}
