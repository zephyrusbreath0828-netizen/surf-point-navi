import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 1ファイルに全JS/CSSをインライン化したデモ用ビルド。
// Service Worker / manifest は外部ファイルのため、デモでは自動的に無効化される(安全にフォールバック)。
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { outDir: 'dist-demo' },
});
