import { useCallback, useEffect, useState } from 'react';
import type { UserLocation } from '../types.ts';
import { loadLocation, saveLocation } from '../lib/storage.ts';

export type GeoStatus = 'idle' | 'loading' | 'ok' | 'error';

/**
 * 現在地取得(Geolocation API)。
 - マウント時に1回自動取得、失敗時は呼び出し側がフォールバック(四国中央)を使う
 - 取得済みの最終位置は localStorage に保存し、次回起動すぐに距離表示へ使う
 */
export function useGeolocation() {
  const [loc, setLoc] = useState<UserLocation | null>(loadLocation);
  const [status, setStatus] = useState<GeoStatus>('idle');

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const l: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          ts: Date.now(),
        };
        setLoc(l);
        saveLocation(l);
        setStatus('ok');
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { loc, status, request };
}
