import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, string>;
    const { _pageId: pageId, _pageSlug: pageSlug, _blockId: blockId, ...data } = body;

    if (!pageId || !blockId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db.formSubmission.create({
      data: {
        pageId,
        pageSlug: pageSlug ?? "",
        blockId,
        data: JSON.stringify(data),
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[forms]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
