import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    // Avoid collision with executive-console's Vite dev server (5173)
    port: 5174,
    strictPort: true,
  },
  build: {
    target: 'esnext',
  },
});
