# サーフポイントナビ (surf-point-navi)

「今日はどこのポイントへ行けば良いか」を素早く判断する、サーフポイント推薦 PWA。
気象データの羅列ではなく、**各ポイントの「おすすめ度」をスコアとコメントで提示**するのがコンセプトです。

ポイントデータは**地方別の JSON ファイル**で管理され、四国から全国・海外へそのまま拡張できる構造です。

- 技術: React + TypeScript + Vite + Tailwind CSS v4 + Leaflet / react-leaflet + PWA(手書き Service Worker)
- バックエンド不要 / ポイント・現在地・予報キャッシュはブラウザの localStorage に保存
- 予報 API: [Open-Meteo](https://open-meteo.com/)(気象 API + Marine API / CC BY 4.0)
- 地図: OpenStreetMap タイル + React-Leaflet

## 機能

| 画面 | 内容 |
|------|------|
| ホーム | 今日のおすすめランキング(1〜3位をカード、4位以降はリスト)。総合評価・星評価・風/波のサマリー・一言コメント+**現在地からの直線距離** |
| ポイント詳細 | 総合評価(スコア+星)、現在予報(風向・風速・波高・うねり方向・気温)、本日の推移チャート(6〜19時の波高/風速+ベストタイム)、評価理由のコメント |
| 地図 | 全ポイントをマーカー表示(**評価点で色分け: 90+緑 / 70〜89青 / 50〜69黄 / 〜49赤**)、現在地(青+精度円)。マーカークリックで詳細へ。Geolocation 失敗時は四国中央を初期中心に表示 |
| ポイント管理 | 追加・編集・削除。名称/都道府県/緯度/経度 + 良い風向・悪い風向・良いうねり方向(16方位から複数選択)+ なじみサイズ + レベル帯 + 底質 |

## ポイントデータの構造(地方別 JSON)

`src/data/regions/` 配下に地方ごとの JSON を置きます(起動時に全ファイル自動読み込み・結合)。

```text
src/data/regions/
  hokkaido.json   北海道
  tohoku.json     東北
  kanto.json      関東
  chubu.json      中部
  kinki.json      近畿
  chugoku.json    中国
  shikoku.json    四国(生見/内妻/小松/入野/双海)
  kyushu.json     九州
  okinawa.json    沖縄
```

JSON 形式(1 ファイル = 1 地方の配列):

```json
[
  {
    "id": "ikumi",
    "name": "生見海岸",
    "prefecture": "高知県",
    "lat": 33.525,
    "lon": 134.288,
    "goodWind": ["N", "NW"],
    "badWind": ["S", "SE"],
    "goodSwell": ["SE", "E"],
    "waveMin": 0.8,
    "waveMax": 2.5
  }
]
```

- `goodWind` / `badWind` / `goodSwell` は 16 方位の方位記号(`N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW`)。8方位表記でも可
- `level` / `bottom`(レベル帯・底質)は省略可能(既定値: beginner / sand)

### 新しい地域の追加方法

**コード変更は不要**です。`src/data/regions/` に新しい JSON を置くだけ。

```text
src/data/regions/hawaii.json      ← 追加するだけ
src/data/regions/indonesia.json
src/data/regions/california.json
```

読み込みは `src/data/index.ts` の `loadRegionData()` が `import.meta.glob` で全 JSON を自動検出し、1 つの配列に結合します(従来の `[...hokkaido, ...tohoku, ...]` 相当)。表示名を付けたい場合は同ファイルの `REGION_LABELS` に 1 行追加します(未登録の場合はファイル名がそのまま表示)。

`src/lib/defaultPoints.ts` は旧バージョンとの互換用モジュールで、`loadRegionData()` の結合結果を `SurfPoint[]` として再エクスポートします(実データは地方 JSON が唯一のソース)。

## スコアリング仕様(独自ロジック)

0〜100 点 = **風 40 点**(goodWind/badWind への近さ×風速) + **うねり 45 点**(goodSwell 入射 50%・なじみサイズ 35%・周期 15%)。

- 風: 風向が `goodWind` に一致→満点、1 方位隣→高め、`badWind` に一致→ほぼ 0 点、1 方位隣→低め、それ以外→中間。風速 3m/s 未満は「無風」として高評価
- うねり: `goodSwell` への一致度 × `waveMin〜waveMax` への収まり × 周期(10 秒以上を高評価)
- ガード: 波高 0.25m 未満はフラット扱いで上限 42 点、`waveMax` の 2 倍超は上限 48 点
- 星: 85+ = 5 / 70+ = 4 / 53+ = 3 / 36+ = 2 / 未満 = 1

評価理由(「北東風(N)はこのポイントの良い風向。面が整いやすい」など)は判定と同時に生成されます。
"ベストタイム"は本日 6〜19 時の各時刻に同じ計算を適用し、最大スコアの時刻を表示します。

## 現在地・地図

- ブラウザの Geolocation API で現在地を取得(起動時 1 回+地図画面のボタンで再取得)。最終位置は localStorage に保存
- 現在地→各ポイントの直線距離(haversine)をランキング・詳細・地図チップに表示
- 現在地取得に失敗した場合は四国中央付近(33.6, 133.55)を初期中心に表示
- 地図タイルは OpenStreetMap(画面内に帰属表示)

## PWA

- `public/manifest.webmanifest` … アイコン・テーマカラー等
- `public/sw.js` … アプリシェルのキャッシュ(オフライン起動可)。予報 API はキャッシュせず、最新の予報は localStorage に保存してオフライン時はそれを表示
- HTTPS でホストすればホーム画面に追加可能(PWA インストール)

## 開発

```bash
npm install
npm run dev        # ローカル開発
npm run typecheck  # 型チェックのみ
npm run build      # 型チェック + 本番ビルド(dist/)
npm run build:demo # 全 JS/CSS を 1 ファイルにインライン化したデモ(dist-demo/)
```

検証スクリプト:

```bash
node --experimental-strip-types scripts/score-check.ts  # スコアリングの単体確認
node --experimental-strip-types scripts/dist-check.ts   # 距離計算の確認
node --experimental-strip-types scripts/e2e-check.ts    # 実API+地方JSON+ランキングの通し確認
```

アイコン再生成: `python3 scripts/make_icons.py`(Pillow が必要)

## デプロイ(GitHub / Vercel)

1. このフォルダを GitHub リポジトリに push
2. Vercel で「Import Project」→ フレームワークpresetsは **Vite** を自動検出
3. Build Command: `npm run build` / Output Directory: `dist`(既定のままで OK)

静的ホスティング(Netlify / Cloudflare Pages 等)も同様に `dist/` を公開するだけです。
サブパスに置く場合は `vite.config.ts` に `base` を追加し、manifest の `start_url`/`scope` を調整してください。

## データ・免責

- 予報は Open-Meteo(気象 API / Marine API)。出典表記 (CC BY 4.0) をアプリ内に含みます
- 地図タイルは © OpenStreetMap contributors
- 海況の判定はあくまで目安です。実海況・現地の警告を優先し、入水は自己責任で判断してください
