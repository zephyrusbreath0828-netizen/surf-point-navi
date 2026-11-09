// 距離計算の検証(松山城を仮の現在地とする)
import { haversineKm, fmtKm } from '../src/lib/distance.ts';
import { DEFAULT_POINTS } from '../src/lib/defaultPoints.ts';

const here = { lat: 33.8417, lng: 132.7656 }; // 松山
for (const p of DEFAULT_POINTS) {
  const km = haversineKm(here, p);
  console.log(`${p.name}: ${fmtKm(km)} (${km.toFixed(1)} km)`);
}
