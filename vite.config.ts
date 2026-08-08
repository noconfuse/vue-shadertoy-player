import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    dts({ include: ['src'] })
  ],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'VueShadertoyPlayer',
      fileName: 'vue-shadertoy-player'
    },
    rollupOptions: {
      // Vue 作为 peerDependency，不进包
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' }
      }
    }
  }
});
