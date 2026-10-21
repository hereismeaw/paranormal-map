export const categories = [
  ['ghost', 'พบเห็นวิญญาณ', 'Ghost sighting', '◉', '#9DFFB0'],
  ['house', 'บ้านผีสิง', 'Haunted house', '⌂', '#9673E6'],
  ['abandoned', 'อาคารร้าง', 'Abandoned building', '▥', '#72E8DF'],
  ['hotel', 'โรงแรมหลอน', 'Haunted hotel', '▤', '#D64B65'],
  ['hospital', 'โรงพยาบาล', 'Haunted hospital', '✚', '#9DFFB0'],
  ['road', 'ถนนหลอน', 'Haunted road', '╱', '#72E8DF'],
  ['cemetery', 'สุสาน', 'Cemetery', '†', '#9673E6'],
  ['forest', 'ป่าลี้ลับ', 'Haunted forest', '♧', '#9DFFB0'],
  ['shadow', 'เงาปริศนา', 'Shadow figure', '◐', '#9673E6'],
  ['sound', 'เสียงปริศนา', 'Unexplained sound', '≋', '#72E8DF'],
  ['poltergeist', 'สิ่งของเคลื่อนที่', 'Poltergeist', '◇', '#D64B65'],
  ['ufo', 'UFO / UAP', 'UFO / UAP', '⊙', '#72E8DF'],
  ['cryptid', 'สิ่งมีชีวิตลึกลับ', 'Cryptid', '△', '#D64B65'],
  ['legend', 'ตำนานท้องถิ่น', 'Local legend', '✦', '#9673E6'],
  ['other', 'เรื่องลี้ลับอื่น ๆ', 'Other', '?', '#9DFFB0'],
] as const;
export const categoryIds = categories.map((c) => c[0]);
export const categoryLabel = (id: string, locale = 'th') => {
  const c = categories.find((c) => c[0] === id);
  return c?.[locale === 'en' ? 2 : 1] ?? id;
};
export type Report = {
  id: string;
  location_id: string;
  slug: string;
  title: string;
  description: string;
  guest_nickname: string | null;
  category: string;
  latitude: number;
  longitude: number;
  province: string;
  district: string;
  sensitive: boolean;
  fictional: boolean;
  published_at: string;
  status: string;
  occurred_at?: string;
  incident_time?: string;
  witnesses?: number;
  observations?: string;
  distance?: number;
  spam_score?: number;
  spam_flags?: string[];
};
