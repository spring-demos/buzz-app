import { createServer } from "vite";
const port = Number(process.env.PORT || 5173);
const server = await createServer({
  configFile: "vite.config.ts",
  define: { "import.meta.env.VITE_BUZZ_LIVE": JSON.stringify("1") },
  server: { port, host: "127.0.0.1", strictPort: true },
});
await server.listen();
server.printUrls();
