import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Configuração Vite da SPA.
// Tailwind v4 via plugin oficial (@tailwindcss/vite) — tokens em index.css.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
