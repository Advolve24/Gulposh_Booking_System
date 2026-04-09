import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),

        widget: path.resolve(
          __dirname,
          "src/widget-entry.jsx"
        ),
      },

      output: {
        entryFileNames: "[name].js",

        chunkFileNames: "assets/[name]-[hash].js",

        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});