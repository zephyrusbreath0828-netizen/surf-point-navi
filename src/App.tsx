import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PointData, Ranked, SurfPoint } from './types.ts';
import { fetchPointData } from './lib/openmeteo.ts';
import { isSameTokyoDay, loadForecastCache, loadPoints, saveForecastCache, savePoints } from './lib/storage.ts';
import { currentForecast, evaluatePoint } from './lib/score.ts';
import { haversineKm } from './lib/distance.ts';
import { useGeolocation } from './hooks/useGeolocation.ts';
import { usePointFilters } from './hooks/usePointFilters.ts';
import { HomeScreen } from './components/HomeScreen.tsx';
import { DetailScreen } from './components/DetailScreen.tsx';
import { MapScreen } from './components/MapScreen.tsx';
import { ManageScreen } from './components/ManageScreen.tsx';
import { RegisterScreen } from './components/RegisterScreen.tsx';
import { TabBar } from './components/TabBar.tsx';
import { genId } from './lib/normalize.ts';
import { addUserPointMeta, loadUserMeta, type UserPointMeta } from './lib/userPoints.ts';
import { buildTideInfo } from './lib/tide.ts';
import { evFromSnapshot, isFresh, loadRankCache, saveRankCache, RANK_TTL_MS, type RankCache } from './lib/cache.ts';
import { loadPointStatuses, savePointStatuses, type PointStatus } from './lib/pointStatus.ts';

type View =
  | { name: 'home' }
  | { name: 'detail'; id: string }
  | { name: 'map' }
  | { name: 'register' }
  | { name: 'manage'; edit?: string };

export default function App() {
  const [points, setPoints] = useState<SurfPoint[]>(loadPoints);
  const [view, setView] = useState<View>({ name: 'home' });
  const [byId, setById] = useState<Record<string, PointData>>({});
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [stale, setStale] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const geo = useGeolocation();
  const [statuses, setStatuses] = useState<Record<string, PointStatus>>(loadPointStatuses);
  /** 起動直後の暫定表示用スナップショット(気象キャッシュ無しのときのみ使用) */
  const [snap, setSnap] = useState<RankCache | null>(null);
  const [updatedJustNow, setUpdatedJustNow] = useState(false);
  const [userMeta, setUserMeta] = useState<Record<string, UserPointMeta>>(loadUserMeta);

  const pointsRef = useRef(points);
  pointsRef.current = points;
  const dataRef = useRef<Record<string, PointData>>({});

  const visibleIdsRef = useRef<Set<string>>(new Set());

  const lastFetchRef = useRef<number | null>(null);
  const geoLocRef = useRef<{ lat: number; lon: number } | null>(null);
  geoLocRef.current = geo.loc;

  /** 近隣300kmを先に取得→遠方を裏で取得(不要なAPI取得を削減) */
  const NEAR_KM = 300;

  const refresh = useCallback(async (force = false) => {
    // キャッシュ有効期限内(3h)の再アクセスでは Open-Meteo を取りに行かない
    if (!force && lastFetchRef.current != null && Date.now() - lastFetchRef.current < RANK_TTL_MS) return;
    setRefreshing(true);
    try {
      const targets = pointsRef.current.filter((p) => visibleIdsRef.current.has(p.id));
      if (targets.length === 0) {
        setById({});
        setStatus('ok');
        setRefreshing(false);
        return;
      }
      const loc = geoLocRef.current;
      // 現在地が分かっているときは近隣のみ先に評価(遠距離地域は後方フェーズへ)
      const near = loc ? targets.filter((p) => haversineKm(loc, p) <= NEAR_KM) : targets;
      const far = loc ? targets.filter((p) => !near.includes(p)) : [];
      const first = await fetchPointData(near);
      dataRef.current = { ...dataRef.current, ...first };
      setById(dataRef.current);
      setStatus('ok');
      setLastFetched(Date.now());
      lastFetchRef.current = Date.now();
      saveForecastCache({ fetchedAt: Date.now(), data: dataRef.current });

      // 遠方ポイントは裏で取得して差し込み(表示は既に返済済み)
      if (far.length > 0) {
        void (async () => {
          try {
            const rest = await fetchPointData(far);
            dataRef.current = { ...dataRef.current, ...rest };
            setById(dataRef.current);
            saveForecastCache({ fetchedAt: Date.now(), data: dataRef.current });
          } catch {
            /* 遠方の失敗は無視(近隣は生きている) */
          }
        })();
      }
      setStale(false);
      setUpdatedJustNow(true);
      window.setTimeout(() => setUpdatedJustNow(false), 3000);
    } catch {
      if (Object.keys(dataRef.current).length === 0) setStatus('error');
      else setStale(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // 1) 保存済みの予報キャッシュがあれば即表示(0.5秒以内の初回描画)
    const cached = loadForecastCache();
    if (cached) {
      dataRef.current = cached.data;
      setById(cached.data);
      setStatus('ok');
      setStale(true);
      setLastFetched(cached.fetchedAt);
      lastFetchRef.current = cached.fetchedAt;
    } else {
      // 2) 気象キャッシュが無くても前回ランキングのスナップショットで暫定表示
      const rc = loadRankCache();
      if (rc) {
        setSnap(rc);
        setStatus('ok');
        setStale(true);
        setLastFetched(rc.fetchedAt);
      }
    }
    // 3) 有効期限(3h)切れのときだけ裏で最新化。期限内は再取得しない
    if (!cached || !isFresh(cached.fetchedAt)) refresh();
    const t = window.setInterval(() => refresh(), 30 * 60 * 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const updatePoints = useCallback(
    (pts: SurfPoint[]) => {
      setPoints(pts);
      savePoints(pts);
      pointsRef.current = pts;
      refresh();
    },
    [refresh]
  );
  // 写真(EXIF GPS)or 地図タップで得た新規ポイントを登録(Open-Meteo評価・検索対象に自動追加)
  const addUserPoint = useCallback(
    (input: { name: string; prefecture: string; region: string; lat: number; lon: number; comment: string }) => {
      const p: SurfPoint = {
        id: genId(),
        name: input.name,
        prefecture: input.prefecture,
        region: input.region,
        lat: input.lat,
        lon: input.lon,
        goodWind: [],
        badWind: [],
        goodSwell: [],
        waveMin: 0.5,
        waveMax: 3.0,
        tidePreference: 'all',
        tideComment: '',
        level: 'beginner',
        bottom: 'sand',
      };
      addUserPointMeta(p.id, input.comment);
      setUserMeta(loadUserMeta());
      updatePoints([...pointsRef.current, p]);
    },
    [updatePoints]
  );

  const changeStatus = useCallback((id: string, s: PointStatus) => {
    setStatuses((prev) => {
      const n = { ...prev, [id]: s };
      savePointStatuses(n);
      return n;
    });
  }, []);
  const changeStatuses = useCallback((ids: string[], s: PointStatus) => {
    setStatuses((prev) => {
      const n = { ...prev };
      for (const id of ids) n[id] = s;
      savePointStatuses(n);
      return n;
    });
  }, []);
  const clearStatuses = useCallback(() => {
    setStatuses({});
    savePointStatuses({});
  }, []);


  const rankedAll = useMemo<Ranked[]>(
    () =>
      points
        .map((p) => {
          const pd = byId[p.id];
          const tide = pd ? buildTideInfo(pd.series, pd.curIdx) : null;
          const snapEv = !pd && snap ? (snap.items.find((s) => s.id === p.id) ? evFromSnapshot(snap.items.find((s) => s.id === p.id)!) : null) : null;
          return {
            point: p,
            ev: pd ? evaluatePoint(p, currentForecast(pd), tide) : snapEv,
            dist: geo.loc ? haversineKm(geo.loc, p) : null,
          };
        })
        .sort((a, b) => (b.ev?.score ?? -1) - (a.ev?.score ?? -1)),
    [points, byId, geo.loc, snap]
  );
  // 非表示ポイントはホーム・地図・ランキングから除外(管理画面で再活性化できる)
  const ranked = useMemo(
    () => rankedAll.filter((r) => (statuses[r.point.id] ?? 'active') !== 'hidden'),
    [rankedAll, statuses]
  );
  useEffect(() => {
    visibleIdsRef.current = new Set(ranked.map((r) => r.point.id));
  }, [ranked]);

  // ランキング結果・スコア・取得日時を localStorage へ保存(次回起動の暫定表示用)
  useEffect(() => {
    if (lastFetched != null && rankedAll.some((r) => r.ev && r.ev.windSpeed !== 0 || r.ev)) {
      const real = rankedAll.filter((r) => r.ev && r.ev.reasons.length > 0);
      if (real.length > 0) saveRankCache(real, lastFetched);
    }
  }, [rankedAll, lastFetched]);

  const detailPoint = view.name === 'detail' ? points.find((p) => p.id === view.id) : undefined;

  // 検索・フィルタ状態(Home と Map で共有 → 検索結果と地図表示が連動)
  const filters = usePointFilters(ranked, geo.loc != null);

  let content: ReactNode;
  if (detailPoint) {
    content = (
      <DetailScreen
        point={detailPoint}
        pd={byId[detailPoint.id]}
        dist={geo.loc ? haversineKm(geo.loc, detailPoint) : null}
        onBack={() => setView({ name: 'home' })}
        onEdit={() => setView({ name: 'manage', edit: detailPoint.id })}
      />
    );
  } else if (view.name === 'map') {
    content = (
      <MapScreen
        ranked={filters.filtered}
        location={geo.loc}
        geoStatus={geo.status}
        onLocate={geo.request}
        onOpen={(id) => setView({ name: 'detail', id })}
      />
    );
  } else if (view.name === 'register') {
    content = <RegisterScreen points={points} onSave={addUserPoint} />;
  } else if (view.name === 'manage') {
    content = (
      <ManageScreen
        points={points}
        rankedAll={rankedAll}
        statuses={statuses}
        userMeta={userMeta}
        onChangeStatus={changeStatus}
        onChangeStatuses={changeStatuses}
        onClearStatuses={clearStatuses}
        geoLoc={geo.loc}
        onSaveAll={updatePoints}
        initialEdit={view.edit}
        geoStatus={geo.status}
        onLocate={geo.request}
      />
    );
  } else {
    content = (
      <HomeScreen
        ranked={ranked}
        filters={filters}
        status={status}
        stale={stale}
        lastFetched={lastFetched}
        refreshing={refreshing}
        onRefresh={() => refresh(true)}
        onOpen={(id) => setView({ name: 'detail', id })}
        geoStatus={geo.status}
        onLocate={geo.request}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md min-h-screen bg-sand-50 shadow-md">
      {content}
      <TabBar
        tab={view.name === 'manage' ? 'manage' : view.name === 'register' ? 'register' : view.name === 'map' ? 'map' : 'home'}
        onTab={(t) => setView(t === 'home' ? { name: 'home' } : t === 'map' ? { name: 'map' } : t === 'register' ? { name: 'register' } : { name: 'manage' })}
      />
    </div>
  );
}
