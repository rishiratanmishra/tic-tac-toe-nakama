import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/antd') || id.includes('@ant-design/icons')) {
            return 'antd';
          }

          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react';
          }

          if (id.includes('@heroiclabs/nakama-js') || id.includes('node_modules/uuid')) {
            return 'realtime';
          }

          return undefined;
        },
      },
    },
  },
})
