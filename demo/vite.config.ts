import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  server: {
    port: 3000,
    watch: {
      usePolling: true,
      interval: 1000
    }
  }
})
