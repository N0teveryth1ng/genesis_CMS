import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "text/plain", "text/csv",
  "application/json",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav",
]);

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const THUMB_WIDTH = 400;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const saved = [];

    for (const file of files) {
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `${file.name} exceeds 20 MB limit` }, { status: 400 });
      }

      const ext      = extname(file.name) || "";
      const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const safeName = `${baseName}${ext}`;
      const filePath = join(uploadsDir, safeName);
      const buffer   = Buffer.from(await file.arrayBuffer());

      await writeFile(filePath, buffer);

      let thumbnailUrl: string | null = null;

      /* Generate thumbnail for raster images */
      if (IMAGE_MIME.has(file.type) && file.type !== "image/gif") {
        try {
          const thumbName = `${baseName}_thumb.webp`;
          const thumbPath = join(uploadsDir, thumbName);
          await sharp(buffer)
            .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(thumbPath);
          thumbnailUrl = `/uploads/${thumbName}`;
        } catch { /* skip thumbnail on error, keep original */ }
      }

      const record = await db.file.create({
        data: {
          name: file.name,
          size: file.size,
          mime: file.type,
          path: safeName,
          url:  `/uploads/${safeName}`,
          thumbnailUrl,
        },
      });

      saved.push(record);
    }

    revalidatePath("/files");
    return NextResponse.json({ ok: true, files: saved });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
