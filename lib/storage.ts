import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join, extname } from "path";

export type StorageProvider = "local" | "s3";

const provider: StorageProvider = (process.env.STORAGE_PROVIDER as StorageProvider) ?? "local";

let s3: S3Client | null = null;
if (provider === "s3") {
  s3 = new S3Client({
    region:      process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
    ...(process.env.AWS_ENDPOINT ? { endpoint: process.env.AWS_ENDPOINT } : {}),
  });
}

const BUCKET  = process.env.AWS_BUCKET  ?? "";
const CDN_URL = process.env.CDN_URL     ?? "";

export interface UploadResult {
  path: string; // relative (local) or S3 key
  url:  string; // public URL
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mime: string,
): Promise<UploadResult> {
  const ext      = extname(originalName) || "";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  if (provider === "s3" && s3) {
    const key = `uploads/${safeName}`;
    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: mime,
    }));
    const url = CDN_URL ? `${CDN_URL}/${key}` : `https://${BUCKET}.s3.amazonaws.com/${key}`;
    return { path: key, url };
  }

  /* Local fallback */
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, safeName), buffer);
  return { path: safeName, url: `/uploads/${safeName}` };
}

export async function deleteStoredFile(filePath: string): Promise<void> {
  if (provider === "s3" && s3) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: filePath }));
    return;
  }
  /* Local: filePath is just the filename */
  try {
    await unlink(join(process.cwd(), "public", "uploads", filePath));
  } catch {
    /* already deleted */
  }
}
