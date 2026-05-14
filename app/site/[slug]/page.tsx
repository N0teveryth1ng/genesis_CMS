import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/actions/pages";
import type { Block } from "@/app/(dashboard)/pages/_components/PageEditor";

/* ── Block renderers ─────────────────────────────────────── */
function HeroBlock({ data }: { data: Record<string, string> }) {
  const align = (data.align ?? "center") as "left" | "center" | "right";
  return (
    <section style={{ background: data.bg ?? "#0f172a", color: data.color ?? "#ffffff", padding: "80px 24px", textAlign: align }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
          {data.heading}
        </h1>
        {data.subheading && (
          <p style={{ fontSize: "1.125rem", opacity: 0.8, marginTop: 16, whiteSpace: "pre-wrap" }}>
            {data.subheading}
          </p>
        )}
      </div>
    </section>
  );
}

function TextBlock({ data }: { data: Record<string, string> }) {
  return (
    <section style={{ padding: "48px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", fontSize: "1.0625rem", lineHeight: 1.75, color: "#374151", whiteSpace: "pre-wrap" }}>
        {data.content}
      </div>
    </section>
  );
}

function ImageBlock({ data }: { data: Record<string, string> }) {
  if (!data.url) return null;
  return (
    <section style={{ padding: "32px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.url} alt={data.alt ?? ""} style={{ maxWidth: "100%", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }} />
        {data.caption && (
          <p style={{ marginTop: 10, fontSize: "0.875rem", color: "#6b7280" }}>{data.caption}</p>
        )}
      </div>
    </section>
  );
}

function ButtonBlock({ data }: { data: Record<string, string> }) {
  const align = data.align ?? "center";
  const variant = data.variant ?? "primary";
  const style: React.CSSProperties = {
    display: "inline-block",
    padding: "12px 32px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: "1rem",
    textDecoration: "none",
    cursor: "pointer",
    ...(variant === "primary" ? { background: "#0ea5e9", color: "#fff" } :
        variant === "outline" ? { border: "2px solid #0ea5e9", color: "#0ea5e9", background: "transparent" } :
        { color: "#0ea5e9", background: "transparent" }),
  };
  return (
    <section style={{ padding: "24px 24px", textAlign: align as "left" | "center" | "right" }}>
      <a href={data.url ?? "#"} style={style}>{data.label ?? "Click here"}</a>
    </section>
  );
}

function DividerBlock() {
  return (
    <section style={{ padding: "8px 24px" }}>
      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", maxWidth: 800, margin: "0 auto" }} />
    </section>
  );
}

function ColumnsBlock({ data }: { data: Record<string, string> }) {
  return (
    <section style={{ padding: "48px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div style={{ fontSize: "1rem", lineHeight: 1.75, color: "#374151", whiteSpace: "pre-wrap" }}>{data.left}</div>
        <div style={{ fontSize: "1rem", lineHeight: 1.75, color: "#374151", whiteSpace: "pre-wrap" }}>{data.right}</div>
      </div>
    </section>
  );
}

function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":    return <HeroBlock    data={block.data} />;
    case "text":    return <TextBlock    data={block.data} />;
    case "image":   return <ImageBlock   data={block.data} />;
    case "button":  return <ButtonBlock  data={block.data} />;
    case "divider": return <DividerBlock />;
    case "columns": return <ColumnsBlock data={block.data} />;
    default:        return null;
  }
}

/* ── Page ────────────────────────────────────────────────── */
export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page || page.status !== "published") notFound();

  let blocks: Block[] = [];
  try { blocks = JSON.parse(page.blocks) as Block[]; } catch { /* empty */ }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{page.seoTitle ?? page.title}</title>
        {page.seoDesc && <meta name="description" content={page.seoDesc} />}
        <style>{`*, *::before, *::after { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; }`}</style>
      </head>
      <body>
        {blocks.map((block) => (
          <RenderBlock key={block.id} block={block} />
        ))}
        {blocks.length === 0 && (
          <div style={{ textAlign: "center", padding: "120px 24px", color: "#9ca3af" }}>
            <p style={{ fontSize: "1.125rem" }}>This page has no content yet.</p>
          </div>
        )}
      </body>
    </html>
  );
}
