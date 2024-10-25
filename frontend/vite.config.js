import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Change the port if needed
  },
  resolve: {
    alias: {
      '@': '/src', // Set up an alias for the source directory
    },
  },
});