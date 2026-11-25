import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

// The GraphQL API (funding-graphql) listens on :4000. Proxying /graphql through
// the dev server keeps the browser same-origin, so the API needs no CORS setup.
const GRAPHQL_TARGET = process.env.GRAPHQL_URL ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [stylex.vite(), react()],
  server: {
    port: 5173,
    proxy: {
      '/graphql': {target: GRAPHQL_TARGET, changeOrigin: true},
    },
  },
  preview: {
    proxy: {
      '/graphql': {target: GRAPHQL_TARGET, changeOrigin: true},
    },
  },
});
