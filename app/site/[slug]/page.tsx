import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/actions/pages";
import type { Block, BlockStyle } from "@/app/(dashboard)/pages/_components/PageEditor";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  return { title: page?.seoTitle ?? page?.title ?? slug };
}

/* ── Style helpers ───────────────────────────────────────── */
const PY: Record<string, string> = {
  none: "0px 24px",
  sm:   "32px 24px",
  md:   "56px 24px",
  lg:   "80px 24px",
  xl:   "96px 24px",
};
const FS: Record<string, string> = {
  sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem",
};
const FW: Record<string, string> = {
  normal: "400", medium: "500", bold: "700",
};
const BR: Record<string, string> = {
  none: "0", sm: "8px", md: "16px", lg: "24px",
};

// Styles for the optional outer wrapper div (font, alignment, border-radius)
function outerWrapStyle(s?: BlockStyle): React.CSSProperties {
  if (!s) return {};
  const hasRadius = s.borderRadius && s.borderRadius !== "none";
  return {
    ...(s.textAlign  ? { textAlign:  s.textAlign  as React.CSSProperties["textAlign"] } : {}),
    ...(s.fontSize   ? { fontSize:   FS[s.fontSize]   } : {}),
    ...(s.fontWeight ? { fontWeight: FW[s.fontWeight] } : {}),
    ...(hasRadius    ? { borderRadius: BR[s.borderRadius!], overflow: "hidden" as const, margin: "0 16px" } : {}),
  };
}

// Resolved section background, color, and padding
function bg(s: BlockStyle | undefined, dataBg?: string, def = "transparent") {
  return s?.bg ?? dataBg ?? def;
}
function color(s: BlockStyle | undefined, dataColor?: string, def?: string) {
  return s?.color ?? dataColor ?? def;
}
function pad(s: BlockStyle | undefined, def: string) {
  return s?.paddingY ? PY[s.paddingY] : def;
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

function HeroBlock({ data, style }: { data: Record<string, string>; style?: BlockStyle }) {
  const align  = (data.align ?? "center") as "left" | "center" | "right";
  const bgCol  = bg(style, data.bg, "#0f172a");
  const txtCol = color(style, data.color, "#ffffff");
  return (
    <section style={{ background: bgCol, color: txtCol, padding: pad(style, "96px 24px"), textAlign: align }}>
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

function FeaturesBlock({ data, style }: { data: Record<string, string>; style?: BlockStyle }) {
  const features = [
    { title: data.f1title, desc: data.f1desc },
    { title: data.f2title, desc: data.f2desc },
    { title: data.f3title, desc: data.f3desc },
  ].filter((f) => f.title);
  return (
    <section style={{ padding: pad(style, "72px 24px"), background: bg(style, undefined, "#ffffff"), color: color(style) }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {data.heading && <h2 style={{ textAlign: "center", fontSize: "2rem", fontWeight: 700, color: color(style, undefined, "#111827"), marginBottom: 48 }}>{data.heading}</h2>}
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

function TestimonialBlock({ data, style }: { data: Record<string, string>; style?: BlockStyle }) {
  return (
    <section style={{ padding: pad(style, "72px 24px"), background: bg(style, data.bg, "#f8fafc"), textAlign: "center", color: color(style) }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <p style={{ fontSize: "1.375rem", fontStyle: "italic", color: color(style, undefined, "#374151"), lineHeight: 1.7, marginBottom: 24 }}>
          &ldquo;{data.quote}&rdquo;
        </p>
        <div>
          <span style={{ fontWeight: 700, color: color(style, undefined, "#111827") }}>{data.author}</span>
          {data.role && <span style={{ color: "#6b7280", marginLeft: 8 }}>— {data.role}</span>}
        </div>
      </div>
    </section>
  );
}

function ContactBlock({ data, style }: { data: Record<string, string>; style?: BlockStyle }) {
  return (
    <section style={{ padding: pad(style, "72px 24px"), background: bg(style, data.bg, "#f8fafc"), color: color(style) }}>
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        {data.heading && <h2 style={{ fontSize: "2rem", fontWeight: 700, color: color(style, undefined, "#111827"), marginBottom: 32 }}>{data.heading}</h2>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.email && <a href={`mailto:${data.email}`} style={{ color: "#0ea5e9", fontSize: "1.125rem", textDecoration: "none" }}>✉ {data.email}</a>}
          {data.phone && <span style={{ color: color(style, undefined, "#374151"), fontSize: "1rem" }}>📞 {data.phone}</span>}
          {data.address && <p style={{ color: "#6b7280", whiteSpace: "pre-wrap", margin: 0 }}>📍 {data.address}</p>}
        </div>
      </div>
    </section>
  );
}

function FooterBlock({ data, style }: { data: Record<string, string>; style?: BlockStyle }) {
  const links  = (data.links ?? "").split(",").map((l) => l.trim()).filter(Boolean);
  const bgCol  = bg(style, data.bg, "#0f172a");
  const txtCol = color(style, data.color, "#ffffff");
  return (
    <footer style={{ background: bgCol, color: txtCol, padding: pad(style, "48px 24px 32px") }}>
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

function TextBlock({ data, style }: { data: Record<string, string>; style?: BlockStyle }) {
  return (
    <section style={{ padding: pad(style, "48px 24px"), background: bg(style), color: color(style) }}>
      <div style={{ maxWidth: 720, margin: "0 auto", fontSize: "1.0625rem", lineHeight: 1.75, color: color(style, undefined, "#374151"), whiteSpace: "pre-wrap" }}>
        {data.content}
      </div>
    </section>
  );
}

function ImageBlock({ data, style }: { data: Record<string, string>; style?: BlockStyle }) {
  if (!data.url) return null;
  return (
    <section style={{ padding: pad(style, "32px 24px"), background: bg(style) }}>
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

function ButtonBlock({ data, style }: { data: Record<string, string>; style?: BlockStyle }) {
  const align   = data.align ?? "center";
  const variant = data.variant ?? "primary";
  const btnStyle: React.CSSProperties = {
    display: "inline-block", padding: "12px 32px", borderRadius: 8,
    fontWeight: 600, fontSize: "1rem", textDecoration: "none", cursor: "pointer",
    ...(variant === "primary" ? { background: "#0ea5e9", color: "#fff" } :
        variant === "outline" ? { border: "2px solid #0ea5e9", color: "#0ea5e9", background: "transparent" } :
        { color: "#0ea5e9", background: "transparent" }),
  };
  return (
    <section style={{ padding: pad(style, "24px 24px"), textAlign: align as "left" | "center" | "right", background: bg(style) }}>
      <a href={data.url ?? "#"} style={btnStyle}>{data.label ?? "Click here"}</a>
    </section>
  );
}

function DividerBlock({ style }: { style?: BlockStyle }) {
  return (
    <section style={{ padding: pad(style, "8px 24px"), background: bg(style) }}>
      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", maxWidth: 800, margin: "0 auto" }} />
    </section>
  );
}

function ColumnsBlock({ data, style }: { data: Record<string, string>; style?: BlockStyle }) {
  return (
    <section style={{ padding: pad(style, "48px 24px"), background: bg(style), color: color(style) }}>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div style={{ fontSize: "1rem", lineHeight: 1.75, color: color(style, undefined, "#374151"), whiteSpace: "pre-wrap" }}>{data.left}</div>
        <div style={{ fontSize: "1rem", lineHeight: 1.75, color: color(style, undefined, "#374151"), whiteSpace: "pre-wrap" }}>{data.right}</div>
      </div>
    </section>
  );
}

function RenderBlock({ block }: { block: Block }) {
  const ws      = outerWrapStyle(block.style);
  const hasWrap = Object.keys(ws).length > 0;

  const inner = (() => {
    switch (block.type) {
      case "navbar":      return <NavbarBlock      data={block.data} />;
      case "hero":        return <HeroBlock        data={block.data} style={block.style} />;
      case "features":    return <FeaturesBlock    data={block.data} style={block.style} />;
      case "testimonial": return <TestimonialBlock data={block.data} style={block.style} />;
      case "contact":     return <ContactBlock     data={block.data} style={block.style} />;
      case "footer":      return <FooterBlock      data={block.data} style={block.style} />;
      case "text":        return <TextBlock        data={block.data} style={block.style} />;
      case "image":       return <ImageBlock       data={block.data} style={block.style} />;
      case "button":      return <ButtonBlock      data={block.data} style={block.style} />;
      case "divider":     return <DividerBlock     style={block.style} />;
      case "columns":     return <ColumnsBlock     data={block.data} style={block.style} />;
      default:            return null;
    }
  })();

  return hasWrap ? <div style={ws}>{inner}</div> : <>{inner}</>;
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
