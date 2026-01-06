import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  server: {
    watch: {
      // Используем polling для избежания проблем с лимитом открытых файлов
      usePolling: true,
      interval: 1000,
      // Игнорируем node_modules и другие ненужные директории
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/*.lock',
        '**/yarn.lock',
        '**/package-lock.json',
        '**/.vite/**'
      ]
    }
  },
  optimizeDeps: {
    // Исключаем из предварительной оптимизации
    exclude: []
  }
})
