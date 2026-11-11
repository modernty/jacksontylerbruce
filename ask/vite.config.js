import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function dialDevOnly() {
  return {
    name: "dial-dev-only",
    enforce: "pre",
    resolveId(source) {
      if (source.includes("dial-dev") && process.env.NODE_ENV === "production") {
        return "\0dial-dev-stub";
      }
      return null;
    },
    load(id) {
      if (id !== "\0dial-dev-stub") return null;
      return "export function CraftDial(){ return null; }\n";
    },
  };
}

export default defineConfig({
  plugins: [react(), dialDevOnly()],
  base: "/ask/dist/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "landing.js",
        assetFileNames: "landing[extname]",
      },
    },
  },
});
