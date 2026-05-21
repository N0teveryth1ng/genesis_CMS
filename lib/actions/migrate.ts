"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const SITE_CONTENT_NAME = "site_content";

/* ── Field definitions for the auto-created site_content collection ── */
const SITE_FIELDS = [
  // Navbar
  { name: "nav_logo",      label: "Navbar — Logo / Brand Name",   type: "text",     sortOrder: 0  },
  { name: "nav_links",     label: "Navbar — Links (JSON)",         type: "json",     sortOrder: 1  },
  { name: "nav_cta",       label: "Navbar — CTA Button Label",     type: "text",     sortOrder: 2  },
  { name: "nav_cta_url",   label: "Navbar — CTA Button URL",       type: "url",      sortOrder: 3  },
  // Hero
  { name: "hero_heading",  label: "Hero — Main Heading",           type: "text",     sortOrder: 4  },
  { name: "hero_subtext",  label: "Hero — Subheading",             type: "textarea", sortOrder: 5  },
  { name: "hero_btn1",     label: "Hero — Button 1 Label",         type: "text",     sortOrder: 6  },
  { name: "hero_btn1_url", label: "Hero — Button 1 URL",           type: "url",      sortOrder: 7  },
  { name: "hero_btn2",     label: "Hero — Button 2 Label",         type: "text",     sortOrder: 8  },
  { name: "hero_btn2_url", label: "Hero — Button 2 URL",           type: "url",      sortOrder: 9  },
  { name: "hero_image",    label: "Hero — Background Image URL",   type: "url",      sortOrder: 10 },
  // About
  { name: "about_heading", label: "About — Heading",               type: "text",     sortOrder: 11 },
  { name: "about_text",    label: "About — Body Text",             type: "textarea", sortOrder: 12 },
  // Footer
  { name: "footer_logo",   label: "Footer — Logo / Brand Name",    type: "text",     sortOrder: 13 },
  { name: "footer_links",  label: "Footer — Links (JSON)",         type: "json",     sortOrder: 14 },
  { name: "footer_copy",   label: "Footer — Copyright Text",       type: "text",     sortOrder: 15 },
];

/* ── Bootstrap the site_content collection once per workspace ── */
export async function bootstrapSiteContent(owner: string, repo: string) {
  const existing = await db.collection.findUnique({ where: { name: SITE_CONTENT_NAME } });
  if (existing) return existing; // already done

  const col = await db.collection.create({
    data: {
      name:        SITE_CONTENT_NAME,
      label:       "Site Content",
      icon:        "Globe",
      description: `Auto-managed content for ${owner}/${repo}. Edit fields here — fetch via API in your app.`,
    },
  });

  await db.field.createMany({
    data: SITE_FIELDS.map((f) => ({ ...f, collectionId: col.id, required: false, unique: false, hidden: false })),
  });

  // Seed one record with placeholder values so clients see the structure immediately
  await db.record.create({
    data: {
      collectionId: col.id,
      data: JSON.stringify({
        nav_logo:      repo,
        nav_links:     JSON.stringify([{ label: "Home", url: "/" }, { label: "About", url: "/about" }, { label: "Contact", url: "/contact" }]),
        nav_cta:       "Get Started",
        nav_cta_url:   "#",
        hero_heading:  "Welcome to " + repo,
        hero_subtext:  "Edit this text from Genesis CMS — no code needed.",
        hero_btn1:     "Get Started",
        hero_btn1_url: "#",
        hero_btn2:     "Learn More",
        hero_btn2_url: "#",
        hero_image:    "",
        about_heading: "About Us",
        about_text:    "Tell your story here.",
        footer_logo:   repo,
        footer_links:  JSON.stringify([{ label: "Privacy", url: "#" }, { label: "Terms", url: "#" }]),
        footer_copy:   `© ${new Date().getFullYear()} ${repo}. All rights reserved.`,
      }),
    },
  });

  revalidatePath("/collections");
  return col;
}

/* ── Get migration info for the kit page ── */
export async function getMigrationKit() {
  const git = await db.gitIntegration.findUnique({ where: { id: "singleton" } });
  const col = await db.collection.findUnique({
    where:   { name: SITE_CONTENT_NAME },
    include: { records: { take: 1 } },
  });

  return { git, col };
}

/* ── Get the current site_content record as a plain object ── */
export async function getSiteContentRecord(): Promise<Record<string, string> | null> {
  const col = await db.collection.findUnique({
    where:   { name: SITE_CONTENT_NAME },
    include: { records: { take: 1 } },
  });
  if (!col || !col.records[0]) return null;
  try { return JSON.parse(col.records[0].data as string) as Record<string, string>; }
  catch { return {}; }
}

/* ── Persist site_content fields — auto-bootstraps if needed ── */
export async function updateSiteContentRecord(data: Record<string, string>) {
  // Auto-bootstrap collection + seed record if they don't exist yet
  let col = await db.collection.findUnique({
    where:   { name: SITE_CONTENT_NAME },
    include: { records: { take: 1 } },
  });

  if (!col) {
    // No collection yet — create it with generic owner/repo placeholder
    const git = await db.gitIntegration.findUnique({ where: { id: "singleton" } });
    await bootstrapSiteContent(
      git?.owner ?? "genesis",
      git?.repo  ?? "site",
    );
    // Re-fetch with records
    col = await db.collection.findUnique({
      where:   { name: SITE_CONTENT_NAME },
      include: { records: { take: 1 } },
    });
  }

  if (!col) return { ok: false, error: "Could not create site_content collection" };

  const existing: Record<string, string> = (() => {
    try { return JSON.parse((col!.records[0]?.data as string) ?? "{}"); } catch { return {}; }
  })();

  if (col!.records[0]) {
    await db.record.update({
      where: { id: col!.records[0].id },
      data:  { data: JSON.stringify({ ...existing, ...data }) },
    });
  } else {
    await db.record.create({
      data: { collectionId: col!.id, data: JSON.stringify(data) },
    });
  }

  revalidatePath("/preview");
  return { ok: true };
}
