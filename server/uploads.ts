import type { Express, Request, Response, NextFunction } from "express";
import { TRPCError } from "@trpc/server";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";
import { createServiceSupabaseClient, isSiteAdmin, verifySupabaseAccessToken } from "./_core/supabase";
import { enforceRateLimit } from "./_core/rateLimit";

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 0 } });
const extByMime: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function getBearer(req: Request): string | null {
  const header = req.headers.authorization;
  const match = header && /^Bearer\s+([A-Za-z0-9._~-]+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

async function requireAdminUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: "unauthorized" });
    const user = await verifySupabaseAccessToken(token);
    if (!user || !(await isSiteAdmin(user))) return res.status(403).json({ error: "forbidden" });
    enforceRateLimit("admin-upload", user.id, 30, 60 * 60 * 1000);
    res.locals.adminUserId = user.id;
    next();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS") return res.status(429).json({ error: "rate_limited" });
    return res.status(503).json({ error: "upload_unavailable" });
  }
}

async function storeUploadedImage(req: Request, res: Response) {
  try {
    if (!req.file || !req.file.buffer.length) return res.status(400).json({ error: "file_required" });
    const type = await fileTypeFromBuffer(req.file.buffer);
    const extension = type?.mime ? extByMime[type.mime] : undefined;
    if (!type || !extension) return res.status(415).json({ error: "unsupported_image_type" });
    const objectPath = `${randomUUID()}.${extension}`;
    const storage = createServiceSupabaseClient().storage.from("portfolio-images");
    const { error } = await storage.upload(objectPath, req.file.buffer, { contentType: type.mime, cacheControl: "3600", upsert: false });
    if (error) return res.status(502).json({ error: "storage_unavailable" });
    return res.status(201).json({ path: objectPath, mime: type.mime, size: req.file.size });
  } catch {
    return res.status(503).json({ error: "upload_unavailable" });
  }
}

export function registerUploadRoutes(app: Express) {
  app.post("/api/admin/upload", requireAdminUpload, (req, res) => {
    imageUpload.single("file")(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ error: error.code === "LIMIT_FILE_SIZE" ? "file_too_large" : "invalid_upload" });
      }
      if (error) return res.status(400).json({ error: "invalid_upload" });
      void storeUploadedImage(req, res);
    });
  });
}
