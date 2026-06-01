import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
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

const IMAGE_MIME  = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE    = 20 * 1024 * 1024;
const THUMB_WIDTH = 400;

export async function POST(req: NextRequest) {
  /* Auth check */
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const files    = formData.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

    const saved = [];

    for (const file of files) {
      if (!ALLOWED_MIME.has(file.type))
        return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400 });
      if (file.size > MAX_SIZE)
        return NextResponse.json({ error: `${file.name} exceeds 20 MB limit` }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const { path, url } = await uploadFile(buffer, file.name, file.type);

      let thumbnailUrl: string | null = null;

      if (IMAGE_MIME.has(file.type) && file.type !== "image/gif") {
        try {
          const thumbBuffer = await sharp(buffer)
            .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          const thumbName = file.name.replace(/\.[^.]+$/, "") + "_thumb.webp";
          const thumb = await uploadFile(thumbBuffer, thumbName, "image/webp");
          thumbnailUrl = thumb.url;
        } catch { /* skip thumbnail */ }
      }

      const record = await db.file.create({
        data: { name: file.name, size: file.size, mime: file.type, path, url, thumbnailUrl },
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
