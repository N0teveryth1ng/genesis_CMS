import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino/file",
      options: { destination: 1 }, // stdout — avoids pino-pretty dep requirement
    },
  }),
  base: { service: "genesis-cms", env: process.env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ["password", "*.password", "token", "*.token", "secret", "*.secret"],
});
