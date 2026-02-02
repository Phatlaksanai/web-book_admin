const winston = require("winston");
require("winston-mongodb");

const logger = winston.createLogger({
  level: "info",
  defaultMeta: { service: "admin-service" },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format((info) => {
      info.createdAt = info.timestamp;
      return info;
    })(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.MongoDB({
      db: process.env.MONGO_URI,
      metaKey: "metadata",
      collection: "logForWeb",
    }),
  ],
});

module.exports = logger;