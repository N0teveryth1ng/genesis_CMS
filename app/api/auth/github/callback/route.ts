import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/settings?sync=error&msg=No+OAuth+code+returned+from+GitHub", req.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings?sync=error&msg=Missing+GitHub+credentials+in+env+variables", req.url));
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL(
          `/settings?sync=error&msg=${encodeURIComponent(
            tokenData.error_description || "Failed to exchange GitHub authorization token"
          )}`,
          req.url
        )
      );
    }

    // Save to singleton GitIntegration
    await db.gitIntegration.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        accessToken,
        enabled: true,
      },
      update: {
        accessToken,
        enabled: true,
      },
    });

    return NextResponse.redirect(new URL("/settings?sync=success", req.url));
  } catch (err: unknown) {
    console.error("GitHub OAuth Callback error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.redirect(
      new URL(`/settings?sync=error&msg=${encodeURIComponent(msg)}`, req.url)
    );
  }
}
