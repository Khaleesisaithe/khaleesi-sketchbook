import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { publicPlatformScript, publicSiteScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerUploadRoutes } from "../uploads";
import { ARTIST_ROUTE } from "../../client/src/lib/privateRoute";

function contentSecurityPolicy() {
  let supabaseOrigin = "";
  let supabaseWebSocket = "";
  try {
    const url = new URL(process.env.SUPABASE_URL ?? "");
    if (url.protocol === "https:" && !url.username && !url.password) {
      supabaseOrigin = url.origin;
      supabaseWebSocket = `wss://${url.host}`;
    }
  } catch { /* unconfigured until the project URL is supplied */ }
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "script-src 'self' https://www.instagram.com https://assets.pinterest.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: ${supabaseOrigin} https://*.cdninstagram.com https://i.pinimg.com`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseWebSocket} https://www.instagram.com https://assets.pinterest.com https://www.pinterest.com https://www.pinterest.ca`,
    "frame-src 'self' https://www.instagram.com https://assets.pinterest.com https://www.pinterest.com https://www.pinterest.ca",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function registerApplication(app: Express): Express {
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    if (req.path.replace(/\/+$/, "") === ARTIST_ROUTE) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    // Vercel applies the same CSP to both CDN assets and Function responses via vercel.json.
    if (process.env.NODE_ENV === "production" && process.env.VERCEL !== "1") {
      res.setHeader("Content-Security-Policy", contentSecurityPolicy());
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "64kb", extended: false }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  app.get("/api/site-config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicSiteScript());
  });
  registerUploadRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(error);
    console.error("Unhandled request error", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ error: "internal_server_error" });
  });
  return app;
}

export function createApplication(): Express {
  return registerApplication(express());
}
