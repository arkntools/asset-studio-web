import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import Vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import { lazyImport, VxeResolver } from 'vite-plugin-lazy-import';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import VueDevTools from 'vite-plugin-vue-devtools';
import SvgLoader from 'vite-svg-loader';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

const nodePolyfillPlugins = () =>
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
  });

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  build: {
    chunkSizeWarningLimit: 5000,
  },
  plugins: [
    VueDevTools({
      componentInspector: {
        toggleComboKey: 'alt-s',
      },
    }),
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
    lazyImport({
      resolvers: [VxeResolver({ libraryName: 'vxe-table' }), VxeResolver({ libraryName: 'vxe-pc-ui' })],
    }),
    SvgLoader(),
    AutoImport({
      imports: ['vue'],
      dirs: [],
      resolvers: [ElementPlusResolver()],
      vueTemplate: true,
      dts: command === 'serve' ? resolve(srcPath, 'auto-imports.d.ts') : false,
      eslintrc: {
        enabled: false,
        filepath: fileURLToPath(new URL('./eslint.config.autoImport.json', import.meta.url)),
        globalsPropValue: 'readonly',
      },
    }),
    Components({
      dirs: [],
      resolvers: [IconsResolver({ enabledCollections: ['ep'], alias: { el: 'ep' } }), ElementPlusResolver()],
      dts: command === 'serve' ? resolve(srcPath, 'components.d.ts') : false,
    }),
    Icons(),
    nodePolyfillPlugins(),
  ],
  worker: {
    format: 'es',
    plugins: () => nodePolyfillPlugins(),
    rolldownOptions: {
      transform: {
        inject: {
          Buffer: 'vite-plugin-node-polyfills/shims/buffer',
        },
      },
    },
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
