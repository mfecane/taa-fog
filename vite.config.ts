import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/taa-fog/' : '/',
  plugins: [glsl()],
  server: {
    open: true,
    port: 3000
  }
});

