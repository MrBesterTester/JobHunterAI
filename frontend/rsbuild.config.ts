import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
  html: {
    template: './public/index.html',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  output: {
    // Use 'build' instead of 'dist' to match CRA output directory
    // This avoids needing to update deployment scripts or .gitignore
    distPath: {
      root: 'build',
    },
  },
});
