import path from "path"
import react from "@vitejs/plugin-react"
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { defineConfig } from "vite"
import { configDefaults } from 'vitest/config'

 
export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
  },
  test: {
    ...configDefaults,
    environment: 'jsdom',
    globals: true,
  },
})