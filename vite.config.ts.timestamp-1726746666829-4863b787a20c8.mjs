// vite.config.ts
import { defineConfig, loadEnv } from "file:///Users/manshar/projects/defog/agents-ui-components/node_modules/vite/dist/node/index.js";
import react from "file:///Users/manshar/projects/defog/agents-ui-components/node_modules/@vitejs/plugin-react-swc/index.mjs";

// package.json
var peerDependencies = {
  react: "^18.3.1",
  "react-dom": "^18.3.1"
};

// vite.config.ts
import { resolve } from "path";
import tailwindcss from "file:///Users/manshar/projects/defog/agents-ui-components/node_modules/tailwindcss/lib/index.js";
import dts from "file:///Users/manshar/projects/defog/agents-ui-components/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/manshar/projects/defog/agents-ui-components";
var vite_config_default = ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return defineConfig({
    css: {
      postcss: {
        plugins: [tailwindcss]
      }
    },
    plugins: [react(), dts({ include: ["lib"] })],
    resolve: {
      alias: {
        "@ui-components": resolve(__vite_injected_original_dirname, "./lib/core-ui.ts")
      }
    },
    build: {
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: {
          agent: resolve(__vite_injected_original_dirname, "lib/agent.ts"),
          doc: resolve(__vite_injected_original_dirname, "lib/doc.ts"),
          "core-ui": resolve(__vite_injected_original_dirname, "lib/core-ui.ts"),
          styles: resolve(__vite_injected_original_dirname, "lib/styles.ts")
        },
        formats: ["es"]
      },
      manifest: true,
      rollupOptions: {
        // make sure to externalize deps that shouldn't be bundled
        // into your library
        external: [...Object.keys(peerDependencies)],
        target: "esnext",
        sourcemap: true
      }
    }
  });
};
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL21hbnNoYXIvcHJvamVjdHMvZGVmb2cvYWdlbnRzLXVpLWNvbXBvbmVudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYW5zaGFyL3Byb2plY3RzL2RlZm9nL2FnZW50cy11aS1jb21wb25lbnRzL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9tYW5zaGFyL3Byb2plY3RzL2RlZm9nL2FnZW50cy11aS1jb21wb25lbnRzL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgeyBwZWVyRGVwZW5kZW5jaWVzIH0gZnJvbSBcIi4vcGFja2FnZS5qc29uXCI7XG5pbXBvcnQgeyBsaWJJbmplY3RDc3MgfSBmcm9tIFwidml0ZS1wbHVnaW4tbGliLWluamVjdC1jc3NcIjtcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gXCJ0YWlsd2luZGNzc1wiO1xuaW1wb3J0IGR0cyBmcm9tIFwidml0ZS1wbHVnaW4tZHRzXCI7XG5cbmV4cG9ydCBkZWZhdWx0ICh7IG1vZGUgfSkgPT4ge1xuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksIFwiXCIpO1xuXG4gIHJldHVybiBkZWZpbmVDb25maWcoe1xuICAgIGNzczoge1xuICAgICAgcG9zdGNzczoge1xuICAgICAgICBwbHVnaW5zOiBbdGFpbHdpbmRjc3NdLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHBsdWdpbnM6IFtyZWFjdCgpLCBkdHMoeyBpbmNsdWRlOiBbXCJsaWJcIl0gfSldLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIFwiQHVpLWNvbXBvbmVudHNcIjogcmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9saWIvY29yZS11aS50c1wiKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgbGliOiB7XG4gICAgICAgIC8vIENvdWxkIGFsc28gYmUgYSBkaWN0aW9uYXJ5IG9yIGFycmF5IG9mIG11bHRpcGxlIGVudHJ5IHBvaW50c1xuICAgICAgICBlbnRyeToge1xuICAgICAgICAgIGFnZW50OiByZXNvbHZlKF9fZGlybmFtZSwgXCJsaWIvYWdlbnQudHNcIiksXG4gICAgICAgICAgZG9jOiByZXNvbHZlKF9fZGlybmFtZSwgXCJsaWIvZG9jLnRzXCIpLFxuICAgICAgICAgIFwiY29yZS11aVwiOiByZXNvbHZlKF9fZGlybmFtZSwgXCJsaWIvY29yZS11aS50c1wiKSxcbiAgICAgICAgICBzdHlsZXM6IHJlc29sdmUoX19kaXJuYW1lLCBcImxpYi9zdHlsZXMudHNcIiksXG4gICAgICAgIH0sXG4gICAgICAgIGZvcm1hdHM6IFtcImVzXCJdLFxuICAgICAgfSxcbiAgICAgIG1hbmlmZXN0OiB0cnVlLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAvLyBtYWtlIHN1cmUgdG8gZXh0ZXJuYWxpemUgZGVwcyB0aGF0IHNob3VsZG4ndCBiZSBidW5kbGVkXG4gICAgICAgIC8vIGludG8geW91ciBsaWJyYXJ5XG4gICAgICAgIGV4dGVybmFsOiBbLi4uT2JqZWN0LmtleXMocGVlckRlcGVuZGVuY2llcyldLFxuICAgICAgICB0YXJnZXQ6IFwiZXNuZXh0XCIsXG4gICAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG59O1xuIiwgIntcbiAgXCJuYW1lXCI6IFwiQGRlZm9nZG90YWkvYWdlbnRzLXVpLWNvbXBvbmVudHNcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjQxXCIsXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiZGV2XCI6IFwidml0ZVwiLFxuICAgIFwiYnVpbGRcIjogXCJ0c2MgJiYgdml0ZSBidWlsZFwiLFxuICAgIFwibGludFwiOiBcImVzbGludCAuIC0tZXh0IGpzLGpzeCAtLXJlcG9ydC11bnVzZWQtZGlzYWJsZS1kaXJlY3RpdmVzIC0tbWF4LXdhcm5pbmdzIDBcIixcbiAgICBcInByZXZpZXdcIjogXCJ2aXRlIHByZXZpZXdcIixcbiAgICBcInBhY2tcIjogXCJucG0gcnVuIGJ1aWxkICYmIG5wbSBwYWNrXCIsXG4gICAgXCJzdG9yeWJvb2tcIjogXCJzdG9yeWJvb2sgZGV2IC1wIDYwMDZcIixcbiAgICBcImJ1aWxkLXN0b3J5Ym9va1wiOiBcInN0b3J5Ym9vayBidWlsZFwiXG4gIH0sXG4gIFwibWFpblwiOiBcImRpc3QvYWdlbnQuanNcIixcbiAgXCJ0eXBlc1wiOiBcImRpc3QvYWdlbnQuZC50c1wiLFxuICBcImV4cG9ydHNcIjoge1xuICAgIFwiLi9hZ2VudFwiOiB7XG4gICAgICBcInR5cGVzXCI6IFwiLi9kaXN0L2FnZW50LmQudHNcIixcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L2FnZW50LmpzXCJcbiAgICB9LFxuICAgIFwiLi9jb3JlLXVpXCI6IHtcbiAgICAgIFwidHlwZXNcIjogXCIuL2Rpc3QvY29yZS11aS5kLnRzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9jb3JlLXVpLmpzXCJcbiAgICB9LFxuICAgIFwiLi9kb2NcIjoge1xuICAgICAgXCJ0eXBlc1wiOiBcIi4vZGlzdC9kb2MuZC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL2Rpc3QvZG9jLmpzXCJcbiAgICB9LFxuICAgIFwiLi9jc3NcIjogXCIuL2Rpc3Qvc3R5bGUuY3NzXCJcbiAgfSxcbiAgXCJmaWxlc1wiOiBbXG4gICAgXCJkaXN0XCJcbiAgXSxcbiAgXCJwZWVyRGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcInJlYWN0XCI6IFwiXjE4LjMuMVwiLFxuICAgIFwicmVhY3QtZG9tXCI6IFwiXjE4LjMuMVwiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBibG9ja25vdGUvY29yZVwiOiBcIl4wLjE0LjVcIixcbiAgICBcIkBibG9ja25vdGUvbWFudGluZVwiOiBcIl4wLjE0LjZcIixcbiAgICBcIkBibG9ja25vdGUvcmVhY3RcIjogXCJeMC4xNC42XCIsXG4gICAgXCJAY29kZW1pcnJvci9sYW5nLXB5dGhvblwiOiBcIl42LjEuNlwiLFxuICAgIFwiQGNvZGVtaXJyb3IvbGFuZy1zcWxcIjogXCJeNi43LjBcIixcbiAgICBcIkBoZWFkbGVzc3VpL3JlYWN0XCI6IFwiXjIuMS4yXCIsXG4gICAgXCJAaGVyb2ljb25zL3JlYWN0XCI6IFwiXjIuMS41XCIsXG4gICAgXCJAb2JzZXJ2YWJsZWhxL3Bsb3RcIjogXCJeMC42LjE2XCIsXG4gICAgXCJAc3FsaXRlLm9yZy9zcWxpdGUtd2FzbVwiOiBcIl4zLjQ2LjAtYnVpbGQyXCIsXG4gICAgXCJAdGlwdGFwL2NvcmVcIjogXCJeMi40LjBcIixcbiAgICBcIkB0aXB0YXAvcG1cIjogXCJeMi40LjBcIixcbiAgICBcIkB0aXB0YXAvc3VnZ2VzdGlvblwiOiBcIl4yLjQuMFwiLFxuICAgIFwiQHVpdy9jb2RlbWlycm9yLWV4dGVuc2lvbnMtY2xhc3NuYW1lXCI6IFwiXjQuMjMuMFwiLFxuICAgIFwiQHVpdy9yZWFjdC1jb2RlbWlycm9yXCI6IFwiXjQuMjMuMFwiLFxuICAgIFwiYW50ZFwiOiBcIl41LjE5LjFcIixcbiAgICBcImNoYXJ0LmpzXCI6IFwiXjQuNC4zXCIsXG4gICAgXCJjaHJvbWEtanNcIjogXCJeMi40LjJcIixcbiAgICBcImNvZGVtaXJyb3JcIjogXCJeNi4wLjFcIixcbiAgICBcImQzXCI6IFwiXjcuOS4wXCIsXG4gICAgXCJkMy1hcnJheVwiOiBcIl4zLjIuNFwiLFxuICAgIFwiZDMtZGFnXCI6IFwiXjEuMS4wXCIsXG4gICAgXCJkMy1zY2FsZVwiOiBcIl40LjAuMlwiLFxuICAgIFwiZDMtc2NhbGUtY2hyb21hdGljXCI6IFwiXjMuMS4wXCIsXG4gICAgXCJkYXlqc1wiOiBcIl4xLjExLjEyXCIsXG4gICAgXCJkb20tdG8taW1hZ2VcIjogXCJeMi42LjBcIixcbiAgICBcImxvdHRpZS1yZWFjdFwiOiBcIl4yLjQuMFwiLFxuICAgIFwibHVjaWRlLXJlYWN0XCI6IFwiXjAuNDI4LjBcIixcbiAgICBcInBhcGFwYXJzZVwiOiBcIl41LjQuMVwiLFxuICAgIFwicHJpc21qc1wiOiBcIl4xLjI5LjBcIixcbiAgICBcInJlYWN0LWNoYXJ0anMtMlwiOiBcIl41LjIuMFwiLFxuICAgIFwicmVhY3Qtc2ltcGxlLWNvZGUtZWRpdG9yXCI6IFwiXjAuMTQuMVwiLFxuICAgIFwic3R5bGVkLWNvbXBvbmVudHNcIjogXCJeNi4xLjExXCIsXG4gICAgXCJ0YWlsd2luZC1tZXJnZVwiOiBcIl4yLjQuMFwiLFxuICAgIFwidXVpZFwiOiBcIl4xMC4wLjBcIixcbiAgICBcInktcGFydHlraXRcIjogXCJeMC4wLjI5XCIsXG4gICAgXCJ5anNcIjogXCJeMTMuNi4xOFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBjaHJvbWF0aWMtY29tL3N0b3J5Ym9va1wiOiBcIl4xLjYuMVwiLFxuICAgIFwiQG1pY3JvbGluay9yZWFjdC1qc29uLXZpZXdcIjogXCJeMS4yMy4xXCIsXG4gICAgXCJAcGxheXdyaWdodC90ZXN0XCI6IFwiXjEuNDcuMVwiLFxuICAgIFwiQHN0b3J5Ym9vay9hZGRvbi1lc3NlbnRpYWxzXCI6IFwiXjguMi42XCIsXG4gICAgXCJAc3Rvcnlib29rL2FkZG9uLWludGVyYWN0aW9uc1wiOiBcIl44LjIuNlwiLFxuICAgIFwiQHN0b3J5Ym9vay9hZGRvbi1saW5rc1wiOiBcIl44LjIuNlwiLFxuICAgIFwiQHN0b3J5Ym9vay9hZGRvbi1vbmJvYXJkaW5nXCI6IFwiXjguMi42XCIsXG4gICAgXCJAc3Rvcnlib29rL2Jsb2Nrc1wiOiBcIl44LjIuNlwiLFxuICAgIFwiQHN0b3J5Ym9vay9yZWFjdFwiOiBcIl44LjIuNlwiLFxuICAgIFwiQHN0b3J5Ym9vay9yZWFjdC12aXRlXCI6IFwiXjguMi42XCIsXG4gICAgXCJAc3Rvcnlib29rL3Rlc3RcIjogXCJeOC4yLjZcIixcbiAgICBcIkB0YWlsd2luZGNzcy9mb3Jtc1wiOiBcIl4wLjUuN1wiLFxuICAgIFwiQHR5cGVzL25vZGVcIjogXCJeMjIuNS41XCIsXG4gICAgXCJAdHlwZXMvcmVhY3RcIjogXCJeMTguMy4zXCIsXG4gICAgXCJAdHlwZXMvcmVhY3QtZG9tXCI6IFwiXjE4LjMuMFwiLFxuICAgIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjogXCJeNC4zLjFcIixcbiAgICBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiOiBcIl4zLjcuMFwiLFxuICAgIFwiYXV0b3ByZWZpeGVyXCI6IFwiXjEwLjQuMTlcIixcbiAgICBcImVzbGludFwiOiBcIl44LjU3LjBcIixcbiAgICBcImVzbGludC1jb25maWctcHJldHRpZXJcIjogXCJeOS4xLjBcIixcbiAgICBcImVzbGludC1wbHVnaW4tcmVhY3RcIjogXCJeNy4zNC4yXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLXJlYWN0LWhvb2tzXCI6IFwiXjQuNi4yXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLXJlYWN0LXJlZnJlc2hcIjogXCJeMC40LjdcIixcbiAgICBcImVzbGludC1wbHVnaW4tc3Rvcnlib29rXCI6IFwiXjAuOC4wXCIsXG4gICAgXCJwb3N0Y3NzXCI6IFwiXjguNC4zOVwiLFxuICAgIFwicHJldHRpZXJcIjogXCJeMy4zLjJcIixcbiAgICBcInByb3AtdHlwZXNcIjogXCJeMTUuOC4xXCIsXG4gICAgXCJzYXNzXCI6IFwiXjEuNzcuN1wiLFxuICAgIFwic3Rvcnlib29rXCI6IFwiXjguMi42XCIsXG4gICAgXCJzdG9yeWJvb2stYWRkb24tanNkb2MtdG8tbWR4XCI6IFwiXjEuMC4zXCIsXG4gICAgXCJ0YWlsd2luZGNzc1wiOiBcIl4zLjQuNFwiLFxuICAgIFwidHlwZWRvY1wiOiBcIl4wLjI2LjVcIixcbiAgICBcInR5cGVzY3JpcHRcIjogXCJeNS41LjRcIixcbiAgICBcInZpdGVcIjogXCJeNS4zLjFcIixcbiAgICBcInZpdGUtcGx1Z2luLWR0c1wiOiBcIl40LjAuMC1iZXRhLjFcIixcbiAgICBcInZpdGUtcGx1Z2luLWxpYi1pbmplY3QtY3NzXCI6IFwiXjIuMS4xXCJcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VSxTQUFTLGNBQWMsZUFBZTtBQUM5VyxPQUFPLFdBQVc7OztBQ2dDaEIsdUJBQW9CO0FBQUEsRUFDbEIsT0FBUztBQUFBLEVBQ1QsYUFBYTtBQUNmOzs7QURoQ0YsU0FBUyxlQUFlO0FBQ3hCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sU0FBUztBQU5oQixJQUFNLG1DQUFtQztBQVF6QyxJQUFPLHNCQUFRLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDM0IsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBRTNDLFNBQU8sYUFBYTtBQUFBLElBQ2xCLEtBQUs7QUFBQSxNQUNILFNBQVM7QUFBQSxRQUNQLFNBQVMsQ0FBQyxXQUFXO0FBQUEsTUFDdkI7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztBQUFBLElBQzVDLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLGtCQUFrQixRQUFRLGtDQUFXLGtCQUFrQjtBQUFBLE1BQ3pEO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsS0FBSztBQUFBO0FBQUEsUUFFSCxPQUFPO0FBQUEsVUFDTCxPQUFPLFFBQVEsa0NBQVcsY0FBYztBQUFBLFVBQ3hDLEtBQUssUUFBUSxrQ0FBVyxZQUFZO0FBQUEsVUFDcEMsV0FBVyxRQUFRLGtDQUFXLGdCQUFnQjtBQUFBLFVBQzlDLFFBQVEsUUFBUSxrQ0FBVyxlQUFlO0FBQUEsUUFDNUM7QUFBQSxRQUNBLFNBQVMsQ0FBQyxJQUFJO0FBQUEsTUFDaEI7QUFBQSxNQUNBLFVBQVU7QUFBQSxNQUNWLGVBQWU7QUFBQTtBQUFBO0FBQUEsUUFHYixVQUFVLENBQUMsR0FBRyxPQUFPLEtBQUssZ0JBQWdCLENBQUM7QUFBQSxRQUMzQyxRQUFRO0FBQUEsUUFDUixXQUFXO0FBQUEsTUFDYjtBQUFBLElBQ0Y7QUFBQSxFQUNGLENBQUM7QUFDSDsiLAogICJuYW1lcyI6IFtdCn0K
