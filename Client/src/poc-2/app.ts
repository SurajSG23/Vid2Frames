import * as fs from "fs";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as https from "https";
import * as morgan from "morgan";
import * as compression from "compression";
import * as cors from "cors";
import { Request, Response, NextFunction } from "express";
import * as config from "config";
import { AppDataSource } from "./data-source";
import logger from "./server/Logger";
import { User } from "./entities";
import axios from "axios";

/* ============================================================
   GLOBAL ERROR HANDLERS (VERY IMPORTANT)
============================================================ */
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

/* ============================================================
   START SERVER
============================================================ */
async function startServer() {
  try {
    const app: express.Application = express();

    /* ===========================
       MORGAN LOGGER
    =========================== */
    app.use(
      morgan(
        ':remote-addr - ":method :url HTTP/:http-version" :status :res[content-length]',
        { stream: { write: (message: any) => logger.info(message.trim()) } }
      )
    );

    /* ===========================
       BODY PARSER
    =========================== */
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json({ limit: "25mb" }));

    /* ===========================
       COMPRESSION + CORS
    =========================== */
    app.use(compression());
    app.use(cors());

    app.disable("x-powered-by");

    /* ===========================
       DATABASE INIT
    =========================== */
    await AppDataSource.initialize();
    logger.info("Connected to the database successfully!");

    /* ===========================
       ROUTES
    =========================== */

    // Example route
    app.get("/health", (_req: Request, res: Response) => {
      res.status(200).json({ message: "Server is running" });
    });

    // User lookup route
    app.get("/userinDB", async (req: Request, res: Response) => {
      try {
        if (!req.query.email) {
          return res.status(400).json({ message: "Email query required" });
        }

        const userRepository = AppDataSource.getRepository(User);

        const record = await userRepository.find({
          where: { email: String(req.query.email).trim() },
        });

        if (!record || record.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ data: record[0] });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
    });

    /* ===========================
       SWAGGER (OPTIONAL)
    =========================== */
    try {
      const swaggerUI = require("swagger-ui-express");
      const swaggerDocument = require("../swagger_output.json");
      app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));
    } catch (err) {
      console.warn("Swagger not loaded:", err);
    }

    /* ===========================
       404 HANDLER
    =========================== */
    app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: { message: "Requested URL not found!" } });
    });

    /* ===========================
       ERROR HANDLER
    =========================== */
    app.use(
      (error: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error("Express Error:", error);
        res.status(error.status || 500).json({
          error: { message: error.message || "Internal Server Error" },
        });
      }
    );

    /* ===========================
       HTTPS SETUP
    =========================== */
    const host = config.get<string>("app.host");
    const port = Number(config.get("app.port"));

    let server;

    try {
      const keyPath = `${__dirname}/server/certificates/key.pem`;
      const certPath = `${__dirname}/server/certificates/cert.pem`;

      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        server = https.createServer(
          {
            secureProtocol: "TLSv1_2_method",
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          },
          app
        );
        logger.info("HTTPS server created successfully.");
      } else {
        throw new Error("Certificate files not found.");
      }
    } catch (httpsError) {
      console.warn("HTTPS failed. Falling back to HTTP.", httpsError);
      server = app;
    }

    /* ===========================
       START LISTENING
    =========================== */
    server
      .listen(port, () => {
        logger.info(`Running API on https://${host}:${port}`);
      })
      .on("error", (err: any) => {
        console.error("SERVER LISTEN ERROR:", err);
        process.exit(1);
      });
  } catch (err) {
    console.error("FATAL STARTUP ERROR:", err);
    process.exit(1);
  }
}

/* ============================================================
   EXECUTE
============================================================ */
startServer();
