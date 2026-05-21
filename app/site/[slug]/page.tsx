import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/actions/pages";
import type { Block } from "@/app/(dashboard)/pages/_components/PageEditor";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  return { title: page?.seoTitle ?? page?.title ?? slug };
}

/* ── Block renderers ─────────────────────────────────────── */
function NavbarBlock({ data }: { data: Record<string, string> }) {
  const links = (data.links ?? "").split(",").map((l) => l.trim()).filter(Boolean);
  return (
    <nav style={{ background: data.bg ?? "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "#111827" }}>{data.logo || "Brand"}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {links.map((l) => (
          <a key={l} href="#" style={{ fontSize: "0.9rem", color: "#374151", textDecoration: "none", fontWeight: 500 }}>{l}</a>
        ))}
        {data.cta && (
          <a href={data.ctaUrl ?? "#"} style={{ background: "#0ea5e9", color: "#fff", padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}>{data.cta}</a>
        )}
      </div>
    </nav>
  );
}

function HeroBlock({ data }: { data: Record<string, string> }) {
  const align = (data.align ?? "center") as "left" | "center" | "right";
  return (
    <section style={{ background: data.bg ?? "#0f172a", color: data.color ?? "#ffffff", padding: "96px 24px", textAlign: align }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
          {data.heading}
        </h1>
        {data.subheading && (
          <p style={{ fontSize: "1.125rem", opacity: 0.8, marginTop: 16, whiteSpace: "pre-wrap", maxWidth: 600, margin: "16px auto 0" }}>
            {data.subheading}
          </p>
        )}
        {data.ctaLabel && (
          <div style={{ marginTop: 32 }}>
            <a href={data.ctaUrl ?? "#"} style={{ background: "#0ea5e9", color: "#fff", padding: "14px 36px", borderRadius: 10, fontWeight: 700, fontSize: "1rem", textDecoration: "none", display: "inline-block" }}>
              {data.ctaLabel}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturesBlock({ data }: { data: Record<string, string> }) {
  const features = [
    { title: data.f1title, desc: data.f1desc },
    { title: data.f2title, desc: data.f2desc },
    { title: data.f3title, desc: data.f3desc },
  ].filter((f) => f.title);
  return (
    <section style={{ padding: "72px 24px", background: "#ffffff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {data.heading && <h2 style={{ textAlign: "center", fontSize: "2rem", fontWeight: 700, color: "#111827", marginBottom: 48 }}>{data.heading}</h2>}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${features.length}, 1fr)`, gap: 32 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: "#f9fafb", borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#e0f2fe", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>✦</div>
              <h3 style={{ fontWeight: 700, color: "#111827", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialBlock({ data }: { data: Record<string, string> }) {
  return (
    <section style={{ padding: "72px 24px", background: data.bg ?? "#f8fafc", textAlign: "center" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <p style={{ fontSize: "1.375rem", fontStyle: "italic", color: "#374151", lineHeight: 1.7, marginBottom: 24 }}>
          &ldquo;{data.quote}&rdquo;
        </p>
        <div>
          <span style={{ fontWeight: 700, color: "#111827" }}>{data.author}</span>
          {data.role && <span style={{ color: "#6b7280", marginLeft: 8 }}>— {data.role}</span>}
        </div>
      </div>
    </section>
  );
}

function ContactBlock({ data }: { data: Record<string, string> }) {
  return (
    <section style={{ padding: "72px 24px", background: data.bg ?? "#f8fafc" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        {data.heading && <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", marginBottom: 32 }}>{data.heading}</h2>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.email && <a href={`mailto:${data.email}`} style={{ color: "#0ea5e9", fontSize: "1.125rem", textDecoration: "none" }}>✉ {data.email}</a>}
          {data.phone && <span style={{ color: "#374151", fontSize: "1rem" }}>📞 {data.phone}</span>}
          {data.address && <p style={{ color: "#6b7280", whiteSpace: "pre-wrap", margin: 0 }}>📍 {data.address}</p>}
        </div>
      </div>
    </section>
  );
}

function FooterBlock({ data }: { data: Record<string, string> }) {
  const links = (data.links ?? "").split(",").map((l) => l.trim()).filter(Boolean);
  return (
    <footer style={{ background: data.bg ?? "#0f172a", color: data.color ?? "#ffffff", padding: "48px 24px 32px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
          <span style={{ fontWeight: 800, fontSize: "1.125rem" }}>{data.logo || "Brand"}</span>
          <div style={{ display: "flex", gap: 24 }}>
            {links.map((l) => (
              <a key={l} href="#" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.875rem" }}>{l}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", margin: 0 }}>{data.copy}</p>
        </div>
      </div>
    </footer>
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
    case "navbar":      return <NavbarBlock      data={block.data} />;
    case "hero":        return <HeroBlock        data={block.data} />;
    case "features":    return <FeaturesBlock    data={block.data} />;
    case "testimonial": return <TestimonialBlock data={block.data} />;
    case "contact":     return <ContactBlock     data={block.data} />;
    case "footer":      return <FooterBlock      data={block.data} />;
    case "text":        return <TextBlock        data={block.data} />;
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
    <main style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#fff", minHeight: "100vh" }}>
      {blocks.map((block) => (
        <RenderBlock key={block.id} block={block} />
      ))}
      {blocks.length === 0 && (
        <div style={{ textAlign: "center", padding: "120px 24px", color: "#9ca3af" }}>
          <p style={{ fontSize: "1.125rem" }}>This page has no content yet.</p>
        </div>
      )}
    </main>
  );
}
