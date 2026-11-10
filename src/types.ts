export type TidePreference = 'low' | 'mid-low' | 'mid' | 'mid-high' | 'high' | 'all';

export type Level = 'beginner' | 'intermediate';
export type Bottom = 'sand' | 'reef' | 'mix';

/** 16方位の方位記号(N, NNE, NE, ...)。地方JSONの goodWind/badWind/goodSwell で使用 */
export type DirLetter =
  | 'N' | 'NNE' | 'NE' | 'ENE'
  | 'E' | 'ESE' | 'SE' | 'SSE'
  | 'S' | 'SSW' | 'SW' | 'WSW'
  | 'W' | 'WNW' | 'NW' | 'NNW';

/**
 * サーフポイント(地方別JSON + ユーザー追加を正規化した形)。
 * level / bottom はJSONでは省略可能(デフォルト: beginner / sand)。
 */
export interface SurfPoint {
  id: string;
  name: string;
  prefecture: string;
  /** 担当地域のID(ファイル名。shikoku / kanto / hawaii ...) */
  region: string;
  lat: number;
  lon: number;
  /** 良い風向(オフショア側) */
  goodWind: DirLetter[];
  /** 悪い風向(オンショア側) */
  badWind: DirLetter[];
  /** 良いうねり方向 */
  goodSwell: DirLetter[];
  /** なじみサイズの下限(m) */
  waveMin: number;
  /** なじみサイズの上限(m) */
  waveMax: number;
  /** 適正潮位(low / mid-low / mid / mid-high / high / all) */
  tidePreference: TidePreference;
  /** 潮位に関するメモ(任意) */
  tideComment: string;
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
  /** 潮位(m, 平均海面基準) — Open-Meteo Marine sea_level_height_msl */
  seaLevel: (number | null)[];
}

export interface PointData {
  series: HourlySeries;
  curIdx: number;
  fetchedAt: number;
}

export type WindTag = 'calm' | 'off' | 'side-off' | 'side' | 'side-on' | 'on';

export interface Evaluation {
  score: number; // 0-100
  stars: number; // 1-5
  label: string;
  reasons: string[];
  windTag: WindTag;
  windDirName: string;
  windSpeed: number;
  waveHeight: number | null;
  waveDirName: string;
  wavePeriod: number | null;
  temp: number;
  /** 潮汐サマリ(例: 大潮・上げ潮・満潮前後(高))。潮汐データ無しなら undefined */
  tideNote?: string;
}

/** 取得した現在地 */
export interface UserLocation {
  lat: number;
  lon: number;
  accuracy: number; // m
  ts: number;
}

/** ランキング1行分(評価+現在地からの距離) */
export interface Ranked {
  point: SurfPoint;
  ev: Evaluation | null;
  dist: number | null;
}
