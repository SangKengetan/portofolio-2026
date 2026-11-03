import { createApp } from "./app";
import { loadConfig, loadDotenvFiles } from "./config/env";
import { buildContainer } from "./container";

loadDotenvFiles();
const config = loadConfig();
const container = buildContainer(config);
const { logger } = container;
const app = createApp(container);

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "API listening");
});

/** Stop accepting connections, let running requests and background jobs finish, then exit. */
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");
  const force = setTimeout(() => {
    logger.error("forced exit after timeout");
    process.exit(1);
  }, 10_000);
  force.unref();
  server.close(async () => {
    try {
      await container.close();
      logger.info("shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "error during shutdown");
      process.exit(1);
    }
  });
  server.closeIdleConnections?.();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));
