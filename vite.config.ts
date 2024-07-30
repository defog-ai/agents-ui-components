import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { peerDependencies } from "./package.json";
import { libInjectCss } from "vite-plugin-lib-inject-css";
import { resolve } from "path";
import tailwindcss from "tailwindcss";
import dts from "vite-plugin-dts";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return defineConfig({
    css: {
      postcss: {
        plugins: [tailwindcss],
      },
    },
    plugins: [react(), dts({ include: ["lib"] })],
    resolve: {
      alias: {
        "@ui-components": resolve(__dirname, "./lib/main.ts"),
      },
    },
    build: {
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: {
          main: resolve(__dirname, "lib/main.ts"),
        },
        formats: ["es"],
      },
      manifest: true,
      rollupOptions: {
        // make sure to externalize deps that shouldn't be bundled
        // into your library
        external: [...Object.keys(peerDependencies)],
        target: "esnext",
        sourcemap: true,
        output: {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
          },
        },
      },
    },
  });
};
