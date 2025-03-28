import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { peerDependencies } from "./package.json";
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
        "@ui-components": resolve(__dirname, "./lib/core-ui.ts"),
        "@agent": resolve(__dirname, "./lib/agent.ts"),
        "@oracle": resolve(__dirname, "./lib/oracle.ts"),
        "@utils": resolve(__dirname, "./lib/components/utils"),
      },
    },

    build: {
      lib: {
        entry: {
          oracle: resolve(__dirname, "lib/oracle.ts"),
          agent: resolve(__dirname, "lib/agent.ts"),
          "core-ui": resolve(__dirname, "lib/core-ui.ts"),
          styles: resolve(__dirname, "lib/styles.ts"),
          utils: resolve(__dirname, "lib/utils.ts"),
        },
        formats: ["es"],
      },
      manifest: true,
      rollupOptions: {
        external: ["react", "react-dom"],
        output: {
          entryFileNames: "[name].js",
        },
      },
      minify: true,
      sourcemap: false,
      reportCompressedSize: true,
    },
  });
};
