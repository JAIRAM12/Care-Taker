import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const apiPort = mode === "development" ? 3001 : 5001;
  const proxy = {
    "/api": {
      target: `http://127.0.0.1:${apiPort}`,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    server: {
      proxy,
      watch: { ignored: ["**/.next/**"] },
    },
    preview: { proxy },
    build: { outDir: "dist", emptyOutDir: true },
  };
});
