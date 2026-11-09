import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PointData, SurfPoint } from './types.ts';
import { fetchPointData } from './lib/openmeteo.ts';
import { isSameTokyoDay, loadForecastCache, loadPoints, saveForecastCache, savePoints } from './lib/storage.ts';
import { currentForecast, evaluatePoint } from './lib/score.ts';
import { HomeScreen, type Ranked } from './components/HomeScreen.tsx';
import { DetailScreen } from './components/DetailScreen.tsx';
import { ManageScreen } from './components/ManageScreen.tsx';
import { TabBar } from './components/TabBar.tsx';

type View = { name: 'home' } | { name: 'detail'; id: string } | { name: 'manage'; edit?: string };

export default function App() {
  const [points, setPoints] = useState<SurfPoint[]>(loadPoints);
  const [view, setView] = useState<View>({ name: 'home' });
  const [byId, setById] = useState<Record<string, PointData>>({});
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [stale, setStale] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const ranked = useMemo<Ranked[]>(
    () =>
      points
        .map((p) => {
          const pd = byId[p.id];
          return { point: p, ev: pd ? evaluatePoint(p, currentForecast(pd)) : null };
        })
        .sort((a, b) => (b.ev?.score ?? -1) - (a.ev?.score ?? -1)),
    [points, byId]
  );

  const detailPoint = view.name === 'detail' ? points.find((p) => p.id === view.id) : undefined;

  let content: ReactNode;
  if (detailPoint) {
    content = (
      <DetailScreen
        point={detailPoint}
        pd={byId[detailPoint.id]}
        onBack={() => setView({ name: 'home' })}
        onEdit={() => setView({ name: 'manage', edit: detailPoint.id })}
      />
    );
  } else if (view.name === 'manage') {
    content = <ManageScreen points={points} onSaveAll={updatePoints} initialEdit={view.edit} />;
  } else {
    content = (
      <HomeScreen
        ranked={ranked}
        status={status}
        stale={stale}
        lastFetched={lastFetched}
        refreshing={refreshing}
        onRefresh={refresh}
        onOpen={(id) => setView({ name: 'detail', id })}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md min-h-screen bg-sand-50 shadow-md">
      {content}
      <TabBar tab={view.name === 'manage' ? 'manage' : 'home'} onTab={(t) => setView(t === 'home' ? { name: 'home' } : { name: 'manage' })} />
    </div>
  );
}
