import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // tokens.scss 提供编译期变量与 mixin，注入到每个组件样式；自身跳过以避免循环 @use
        additionalData: (source: string, filename: string) =>
          /[\\/]styles[\\/]tokens\.scss$/.test(filename) ? source : `@use "@/styles/tokens" as *;\n${source}`,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    open: false,
  },
  worker: {
    format: 'es',
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
