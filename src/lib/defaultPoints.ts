import type { SurfPoint } from '../types.ts';

/**
 * 初期登録ポイント(四国)。
 * 座標は海岸付近の目安値、bearing(向き)は海岸線の走向からの推定値。
 * すべてポイント管理画面から編集可能。
 */
export const DEFAULT_POINTS: SurfPoint[] = [
  {
    id: 'ikumi',
    name: '生見海岸',
    lat: 33.5253,
    lng: 134.282,
    bearing: 105,
    sizeMin: 0.8,
    sizeMax: 1.5,
    level: 'intermediate',
    bottom: 'sand',
  },
  {
    id: 'uchizuma',
    name: '内妻海岸',
    lat: 33.661,
    lng: 134.3985,
    bearing: 140,
    sizeMin: 0.6,
    sizeMax: 1.2,
    level: 'beginner',
    bottom: 'sand',
  },
  {
    id: 'komatsu',
    name: '小松海岸',
    lat: 34.056,
    lng: 134.607,
    bearing: 95,
    sizeMin: 0.4,
    sizeMax: 1.0,
    level: 'beginner',
    bottom: 'sand',
  },
  {
    id: 'irino',
    name: '入野海岸',
    lat: 33.0211,
    lng: 133.0163,
    bearing: 150,
    sizeMin: 0.8,
    sizeMax: 1.5,
    level: 'beginner',
    bottom: 'sand',
  },
  {
    id: 'futami',
    name: '双海海岸',
    lat: 33.67,
    lng: 132.63,
    bearing: 295,
    sizeMin: 0.6,
    sizeMax: 1.2,
    level: 'beginner',
    bottom: 'sand',
  },
];
