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
import { addUserPointMeta } from './lib/userPoints.ts';

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

  const pointsRef = useRef(points);
  pointsRef.current = points;
  const dataRef = useRef<Record<string, PointData>>({});

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchPointData(pointsRef.current);
      dataRef.current = data;
      setById(data);
      setStatus('ok');
      setStale(false);
      setLastFetched(Date.now());
      saveForecastCache({ fetchedAt: Date.now(), data });
    } catch {
      if (Object.keys(dataRef.current).length === 0) setStatus('error');
      else setStale(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const cached = loadForecastCache();
    if (cached && isSameTokyoDay(cached.fetchedAt)) {
      dataRef.current = cached.data;
      setById(cached.data);
      setStatus('ok');
      setStale(true);
      setLastFetched(cached.fetchedAt);
    }
    refresh();
    const t = window.setInterval(refresh, 30 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [refresh]);


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
        level: 'beginner',
        bottom: 'sand',
      };
      addUserPointMeta(p.id, input.comment);
      updatePoints([...pointsRef.current, p]);
    },
    [updatePoints]
  );


  const ranked = useMemo<Ranked[]>(
    () =>
      points
        .map((p) => {
          const pd = byId[p.id];
          return {
            point: p,
            ev: pd ? evaluatePoint(p, currentForecast(pd)) : null,
            dist: geo.loc ? haversineKm(geo.loc, p) : null,
          };
        })
        .sort((a, b) => (b.ev?.score ?? -1) - (a.ev?.score ?? -1)),
    [points, byId, geo.loc]
  );

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
    content = <ManageScreen points={points} onSaveAll={updatePoints} initialEdit={view.edit} />;
  } else {
    content = (
      <HomeScreen
        ranked={ranked}
        filters={filters}
        status={status}
        stale={stale}
        lastFetched={lastFetched}
        refreshing={refreshing}
        onRefresh={refresh}
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
