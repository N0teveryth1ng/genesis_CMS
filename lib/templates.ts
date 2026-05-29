import type { Block, BlockStyle } from "@/app/(dashboard)/pages/_components/PageEditor";

type TemplateBlock = Omit<Block, "id"> & { style?: BlockStyle };

export interface Template {
  id:          string;
  name:        string;
  description: string;
  emoji:       string;
  category:    string;
  blocks:      TemplateBlock[];
}

const FORM_FIELDS_DEFAULT = JSON.stringify([
  { id: "f1", label: "Full Name",     type: "text",     required: true  },
  { id: "f2", label: "Email Address", type: "email",    required: true  },
  { id: "f3", label: "Message",       type: "textarea", required: true  },
]);

export const TEMPLATES: Template[] = [
  {
    id:          "saas-landing",
    name:        "SaaS Landing Page",
    description: "Conversion-focused page with hero, features, testimonial, and CTA.",
    emoji:       "🚀",
    category:    "Landing",
    blocks: [
      { type: "navbar",      data: { logo: "YourBrand", links: "Features,Pricing,Blog", cta: "Start Free", ctaUrl: "#" } },
      { type: "hero",        data: { heading: "Ship your ideas faster", subheading: "The all-in-one platform for modern teams. No code required.", ctaLabel: "Get Started Free →", ctaUrl: "#", align: "center" }, style: { bg: "#0f172a", color: "#ffffff", paddingY: "xl" } },
      { type: "features",    data: { heading: "Everything you need", f1title: "⚡ Blazing Fast", f1desc: "Sub-second page loads with Next.js.", f2title: "🔒 Secure by Default", f2desc: "Enterprise-grade security out of the box.", f3title: "🔌 Extensible", f3desc: "Plugins, webhooks, and custom flows." } },
      { type: "testimonial", data: { quote: "Genesis CMS completely transformed how our team ships pages. 10x faster than before.", author: "Alex Chen", role: "CTO, Acme Corp" }, style: { bg: "#f8fafc" } },
      { type: "button",      data: { label: "Start your free trial →", url: "#", align: "center", variant: "primary" }, style: { paddingY: "md" } },
      { type: "footer",      data: { logo: "YourBrand", links: "Features,Pricing,Blog,Privacy,Terms", copy: "© 2025 YourBrand, Inc. All rights reserved." }, style: { bg: "#0f172a", color: "#ffffff" } },
    ],
  },
  {
    id:          "about-page",
    name:        "About Page",
    description: "Company story, mission, and team intro with a two-column layout.",
    emoji:       "💡",
    category:    "Content",
    blocks: [
      { type: "navbar",  data: { logo: "YourBrand", links: "Home,About,Contact", cta: "Get in Touch", ctaUrl: "#" } },
      { type: "hero",    data: { heading: "We're building the future", subheading: "A small team with a big mission — making the web easier for everyone.", ctaLabel: "", ctaUrl: "", align: "center" }, style: { bg: "#1e293b", color: "#ffffff", paddingY: "lg" } },
      { type: "columns", data: { left: "Our Story\n\nFounded in 2020, we started with a simple idea: developer tools should be beautiful AND powerful. We've been on that mission ever since.", right: "Our Mission\n\nTo make content management accessible to everyone. No complexity, no gatekeeping — just powerful tools in the hands of creators and their teams." } },
      { type: "text",    data: { content: "We're a remote-first team spread across 12 countries. We believe in async communication, deep work, and shipping fast without compromising quality.\n\nEvery decision we make is guided by one question: does this make our users' lives better?" } },
      { type: "footer",  data: { logo: "YourBrand", links: "Home,About,Careers,Contact", copy: "© 2025 YourBrand. Made with ❤️ worldwide." }, style: { bg: "#0f172a", color: "#ffffff" } },
    ],
  },
  {
    id:          "contact-page",
    name:        "Contact Page",
    description: "A form page with contact details and a working submission form.",
    emoji:       "✉️",
    category:    "Contact",
    blocks: [
      { type: "navbar",  data: { logo: "YourBrand", links: "Home,About,Services", cta: "Contact Us", ctaUrl: "#" } },
      { type: "hero",    data: { heading: "Let's work together", subheading: "Tell us about your project and we'll get back to you within 24 hours.", ctaLabel: "", ctaUrl: "", align: "center" }, style: { bg: "#0ea5e9", color: "#ffffff", paddingY: "lg" } },
      { type: "form",    data: { heading: "Send us a message", submitLabel: "Send Message", successMsg: "Thanks! We'll get back to you within 24 hours.", fields: FORM_FIELDS_DEFAULT } },
      { type: "contact", data: { heading: "Or reach us directly", email: "hello@example.com", phone: "+1 (555) 000-0000", address: "123 Main St\nSan Francisco, CA 94102" } },
      { type: "footer",  data: { logo: "YourBrand", links: "Home,About,Privacy", copy: "© 2025 YourBrand." }, style: { bg: "#0f172a", color: "#ffffff" } },
    ],
  },
  {
    id:          "blog-post",
    name:        "Blog Post",
    description: "Clean reading layout with a title header, body text, and footer.",
    emoji:       "📝",
    category:    "Content",
    blocks: [
      { type: "navbar",      data: { logo: "The Blog", links: "Home,Articles,Newsletter", cta: "Subscribe", ctaUrl: "#" } },
      { type: "hero",        data: { heading: "Your Article Title Goes Here", subheading: "8 min read · Published January 2025 · By Your Name", ctaLabel: "", ctaUrl: "", align: "left" }, style: { bg: "#f8fafc", color: "#111827", paddingY: "md" } },
      { type: "text",        data: { content: "Start your article here. Write naturally and let your ideas flow. Use short paragraphs and clear language to keep readers engaged.\n\nThis is the second paragraph of your article. Expand on your main point with examples, data, or personal experience.\n\nYour conclusion goes here. Summarize your key takeaway and leave the reader with something actionable or thought-provoking." } },
      { type: "divider",     data: {} },
      { type: "text",        data: { content: "Written by Your Name · Follow on Twitter" }, style: { textAlign: "center", fontSize: "sm", color: "#6b7280" } },
      { type: "footer",      data: { logo: "The Blog", links: "Home,Archive,RSS,About", copy: "© 2025 The Blog. All rights reserved." }, style: { bg: "#0f172a", color: "#ffffff" } },
    ],
  },
  {
    id:          "portfolio",
    name:        "Portfolio",
    description: "Showcase your work with a hero, project grid, and bio section.",
    emoji:       "🎨",
    category:    "Portfolio",
    blocks: [
      { type: "navbar",      data: { logo: "Your Name", links: "Work,About,Contact", cta: "Hire Me", ctaUrl: "#contact" } },
      { type: "hero",        data: { heading: "Design. Build. Ship.", subheading: "I create beautiful digital experiences that solve real problems.", ctaLabel: "View My Work ↓", ctaUrl: "#work", align: "center" }, style: { bg: "#4f46e5", color: "#ffffff", paddingY: "xl" } },
      { type: "features",    data: { heading: "Featured Projects", f1title: "Project Alpha", f1desc: "Full-stack web app built with Next.js and PostgreSQL. Increased user retention by 40%.", f2title: "Brand Identity", f2desc: "Complete visual identity system for a Series A startup. Shipped in 3 weeks.", f3title: "Mobile App", f3desc: "Cross-platform app with React Native. 50k+ downloads in first month." } },
      { type: "image",       data: { url: "https://placehold.co/800x400/6366f1/ffffff?text=Portfolio+Preview", alt: "Portfolio work preview", caption: "Recent project showcase" } },
      { type: "text",        data: { content: "I'm a designer and developer with 5+ years of experience crafting products people love. I care deeply about the intersection of design and engineering.\n\nCurrently open to new opportunities." }, style: { textAlign: "center" } },
      { type: "footer",      data: { logo: "Your Name", links: "Work,About,Contact,LinkedIn", copy: "© 2025 Your Name. Let's build something great." }, style: { bg: "#0f172a", color: "#ffffff" } },
    ],
  },
];
