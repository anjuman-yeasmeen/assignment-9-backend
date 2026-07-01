import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();

  // CORS with credentials so the httpOnly auth cookie flows cross-origin.
  app.use(
    cors({
      origin: true, // incoming request-এর origin echo করে দেয়, '*' নয়
      credentials: true,
    }),
  );

  // Behind a proxy (Render/Vercel) so `secure` cookies work over forwarded TLS.
  app.set("trust proxy", 1);

  app.use(express.json());
  app.use(cookieParser());
  if (!env.isProduction) app.use(morgan("dev"));

  // Health check.
  app.get("/", (_req, res) => res.json({ service: "ideavault-api", status: "ok" }));

  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
