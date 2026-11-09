export type Level = 'beginner' | 'intermediate';
export type Bottom = 'sand' | 'reef' | 'mix';

/** サーフポイントの条件マスタ(全てユーザー編集可・ブラウザ保存) */
export interface SurfPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** ポイントが海に向いている方位(度・0=北)。この方向からうねりが入るとまっすぐ入る */
  bearing: number;
  /** なじみサイズ(良い波になる波高レンジ・下限 m) */
  sizeMin: number;
  /** なじみサイズ(上限 m) */
  sizeMax: number;
  level: Level;
  bottom: Bottom;
}

/** ある1時刻の予報スナップショット */
export interface Forecast {
  time: string; // "2026-11-09T08:00" (現地=日本時刻)
  windDir: number; // 風向(風が「から」来る方位・度)
  windSpeed: number; // m/s
  waveHeight: number | null; // 波高 m
  waveDir: number | null; // うねりの来向(度)
  wavePeriod: number | null; // うねりの周期 s
  temp: number; // 気温 ℃
}

export interface HourlySeries {
  time: string[];
  windDir: number[];
  windSpeed: number[];
  temp: number[];
  waveHeight: (number | null)[];
  waveDir: (number | null)[];
  wavePeriod: (number | null)[];
}

export interface PointData {
  series: HourlySeries;
  curIdx: number;
  fetchedAt: number;
}

export type WindTag = 'calm' | 'off' | 'side-off' | 'side' | 'side-on' | 'on';
