import { type NextRequest } from "next/server";
import sharp from "sharp";
import { Readable } from "node:stream";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const src     = searchParams.get("src");
  const w       = searchParams.get("w") ? parseInt(searchParams.get("w")!) : undefined;
  const h       = searchParams.get("h") ? parseInt(searchParams.get("h")!) : undefined;
  const quality = searchParams.get("q") ? Math.min(100, Math.max(1, parseInt(searchParams.get("q")!))) : 85;
  const format  = (searchParams.get("f") ?? "webp") as "webp" | "jpeg" | "png";

  if (!src)                    return Response.json({ error: "src required" },                    { status: 400 });
  if (!src.startsWith("/uploads/")) return Response.json({ error: "Only /uploads/ paths allowed" }, { status: 403 });

  const filePath = path.join(process.cwd(), "public", src);
  try {
    const input  = await fs.readFile(filePath);
    let pipeline = sharp(input);
    if (w || h) pipeline = pipeline.resize(w, h, { fit: "cover", withoutEnlargement: true });

    const MIME: Record<string, string> = { webp: "image/webp", jpeg: "image/jpeg", png: "image/png" };
    const mime = MIME[format];

    const sharpStream = format === "jpeg" ? pipeline.jpeg({ quality })
                      : format === "png"  ? pipeline.png()
                      :                    pipeline.webp({ quality });

    const webStream = Readable.toWeb(sharpStream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      headers: {
        "Content-Type":  mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return Response.json({ error: "Transform failed" }, { status: 500 });
  }
}
