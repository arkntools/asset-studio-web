import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import Vue from '@vitejs/plugin-vue';
import { VxeResolver } from '@vxecli/import-unplugin-vue-components';
import AutoImport from 'unplugin-auto-import/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import SvgLoader from 'vite-svg-loader';

const pathSrc = resolve(__dirname, 'src');

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    VitePWA({
      registerType: 'prompt',
      workbox: {
        maximumFileSizeToCacheInBytes: 4e6,
      },
      manifest: {
        name: 'AssetStudio Web',
        short_name: 'AS Web',
        background_color: '#f4f4f5',
        theme_color: '#f4f4f5',
        display: 'standalone',
        icons: [
          {
            sizes: '192x192',
            src: '/android-chrome-192x192.png',
            type: 'image/png',
          },
          {
            sizes: '512x512',
            src: '/android-chrome-512x512.png',
            type: 'image/png',
          },
        ],
      },
    }),
    Vue(),
    SvgLoader(),
    AutoImport({
      imports: ['vue'],
      dirs: [],
      resolvers: [ElementPlusResolver()],
      vueTemplate: true,
      dts: command === 'serve' ? resolve(pathSrc, 'auto-imports.d.ts') : false,
      eslintrc: {
        enabled: false,
        filepath: resolve(__dirname, 'eslint.config.autoImport.json'),
        globalsPropValue: 'readonly',
      },
    }),
    Components({
      dirs: [],
      resolvers: [
        IconsResolver({ enabledCollections: ['ep'], alias: { el: 'ep' } }),
        ElementPlusResolver(),
        VxeResolver({ libraryName: 'vxe-table', importStyle: true }),
      ],
      dts: command === 'serve' ? resolve(pathSrc, 'components.d.ts') : false,
    }),
    Icons(),
    nodePolyfills({
      include: ['buffer', 'fs', 'path', 'crypto'],
      globals: {
        Buffer: true,
      },
      overrides: {
        fs: 'empty-module',
        path: 'empty-module',
        crypto: 'empty-module',
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'lodash-es': 'es-toolkit/compat',
    },
  },
  optimizeDeps: {
    exclude: ['@jimp/wasm-png'],
  },
}));
