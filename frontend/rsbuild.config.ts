import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/index.tsx',
    },
    define: {
      // Inject REACT_APP_DEBUG_MODE environment variable into the bundle
      'process.env.REACT_APP_DEBUG_MODE': JSON.stringify(
        process.env.REACT_APP_DEBUG_MODE || 'false'
      ),
      // Inject REACT_APP_DEBUG_STATS environment variable for stats debugging
      'process.env.REACT_APP_DEBUG_STATS': JSON.stringify(
        process.env.REACT_APP_DEBUG_STATS || 'false'
      ),
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
