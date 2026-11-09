import type { Ranked } from '../types.ts';

/** 地方フィルタの選択肢(pack ID = SurfPoint.region) */
export const REGIONS: { id: string; label: string }[] = [
  { id: 'japan-hokkaido', label: '北海道' },
  { id: 'japan-tohoku', label: '東北' },
  { id: 'japan-kanto', label: '関東' },
  { id: 'japan-chubu', label: '中部' },
  { id: 'japan-kinki', label: '近畿' },
  { id: 'japan-chugoku', label: '中国' },
  { id: 'japan-shikoku', label: '四国' },
  { id: 'japan-kyushu', label: '九州' },
  { id: 'japan-okinawa', label: '沖縄' },
];

/** 都道府県の標準的並び(欠けがあってもこの順でソートする) */
export const PREF_ORDER: string[] = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

function prefRank(p: string): number {
  const i = PREF_ORDER.indexOf(p);
  return i === -1 ? PREF_ORDER.length : i;
}

/** 絞り込み済み(ranked)に出現する都道府県を標準順で返す */
export function prefecturesFor(ranked: Ranked[], region: string | 'all'): string[] {
  const seen = new Set<string>();
  for (const r of ranked) {
    if (region !== 'all' && r.point.region !== region) continue;
    if (r.point.prefecture) seen.add(r.point.prefecture);
  }
  return [...seen].sort((a, b) => prefRank(a) - prefRank(b) || a.localeCompare(b, 'ja'));
}
