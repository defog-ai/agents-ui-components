import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { peerDependencies } from "./package.json";
import { resolve } from "path";
import tailwindcss from "tailwindcss";
import dts from "vite-plugin-dts";
import fs from 'fs';

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
    server: {
      strictPort: false,
      // Custom middleware to handle public report routes
      middlewareMode: false,
      proxy: {
        // For API calls to the backend
        "/api/public/report": {
          target: env.VITE_API_ENDPOINT,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api', '')
        }
      },
      // Make public report routes work
      configureServer: (server) => {
        server.middlewares.use((req, res, next) => {
          // Check if the URL matches a public report path
          if (req.url?.startsWith('/public/report/')) {
            // Handle API requests vs. UI navigation
            if (req.headers.accept?.includes('application/json')) {
              // If this is a data request, proxy to the real API
              req.url = '/api' + req.url;
              next();
            } else {
              // If this is a page request, serve the public-report-viewer.html
              const publicViewerPath = resolve(__dirname, 'test/oracle/public-report-viewer.html');
              const html = fs.readFileSync(publicViewerPath, 'utf-8');
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
            }
          } else {
            next();
          }
        });
      }
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
