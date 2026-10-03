import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed at the root of https://aparajitasarkar.github.io/ (a user site),
// but a relative base keeps the build portable (project pages, previews, file://).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', sourcemap: false },
})
