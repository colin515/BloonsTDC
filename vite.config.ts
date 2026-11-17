import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const base = '/BloonsTDC/';

export default defineConfig({
  base,
  build: {
    assetsDir: 'forge-assets',
    rollupOptions: {
      input: fileURLToPath(new URL('./src/page.html', import.meta.url)),
    },
    chunkSizeWarningLimit: 950,
  },
  plugins: [{
    name: 'forge-development-entry',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url === base || request.url === '/') request.url = base + 'src/page.html';
        next();
      });
    },
  }],
});
