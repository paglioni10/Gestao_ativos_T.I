import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Config padrão do Vite com o plugin do React.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
