/**
 * Built-in extension plugin definitions.
 * Each plugin has metadata + an execute() that transforms record data before save.
 */

export type PluginConfigField = {
  key:         string;
  label:       string;
  type:        "text" | "select";
  placeholder?: string;
  options?:    { label: string; value: string }[];
  required?:   boolean;
};

export type Plugin = {
  id:          string;
  name:        string;
  description: string;
  icon:        string;  // emoji
  category:    "transform" | "validation" | "compute";
  configFields: PluginConfigField[];
  execute: (
    data:   Record<string, unknown>,
    config: Record<string, unknown>,
    event:  "create" | "update",
  ) => Record<string, unknown>;
};

/* ── Helpers ─────────────────────────────────────────────── */

function slugify(str: string): string {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ── Plugin registry ─────────────────────────────────────── */

export const PLUGINS: Plugin[] = [
  {
    id:          "auto-slug",
    name:        "Auto Slug",
    description: "Generates a URL-safe slug from a source field into a target field on create.",
    icon:        "🔗",
    category:    "compute",
    configFields: [
      { key: "sourceField", label: "Source Field", type: "text", placeholder: "title", required: true },
      { key: "targetField", label: "Target Field", type: "text", placeholder: "slug",  required: true },
      { key: "overwrite",   label: "Overwrite on update", type: "select",
        options: [{ label: "No (create only)", value: "no" }, { label: "Yes (always)", value: "yes" }] },
    ],
    execute(data, config, event) {
      const src  = String(config.sourceField ?? "title");
      const dest = String(config.targetField ?? "slug");
      const over = config.overwrite === "yes";
      if (event === "create" || over) {
        const sourceVal = data[src];
        if (sourceVal && (!data[dest] || over)) {
          return { ...data, [dest]: slugify(String(sourceVal)) };
        }
      }
      return data;
    },
  },

  {
    id:          "word-count",
    name:        "Word Count",
    description: "Counts words in a text field and stores the integer result in a target field.",
    icon:        "📝",
    category:    "compute",
    configFields: [
      { key: "sourceField", label: "Source Field", type: "text", placeholder: "body",      required: true },
      { key: "targetField", label: "Target Field", type: "text", placeholder: "wordCount", required: true },
    ],
    execute(data, config) {
      const src  = String(config.sourceField ?? "body");
      const dest = String(config.targetField ?? "wordCount");
      const text = String(data[src] ?? "");
      const count = text.trim() ? text.trim().split(/\s+/).length : 0;
      return { ...data, [dest]: count };
    },
  },

  {
    id:          "capitalize",
    name:        "Auto Capitalize",
    description: "Capitalizes the first letter of a field value before saving.",
    icon:        "🔠",
    category:    "transform",
    configFields: [
      { key: "field", label: "Field Name", type: "text", placeholder: "title", required: true },
    ],
    execute(data, config) {
      const f = String(config.field ?? "title");
      const v = String(data[f] ?? "");
      if (!v) return data;
      return { ...data, [f]: v.charAt(0).toUpperCase() + v.slice(1) };
    },
  },

  {
    id:          "set-defaults",
    name:        "Set Defaults",
    description: "Fills in default field values on record create if the field is empty.",
    icon:        "⚙️",
    category:    "transform",
    configFields: [
      { key: "field1", label: "Field 1 Name",    type: "text", placeholder: "status"  },
      { key: "value1", label: "Field 1 Default",  type: "text", placeholder: "draft"   },
      { key: "field2", label: "Field 2 Name",    type: "text", placeholder: "priority" },
      { key: "value2", label: "Field 2 Default",  type: "text", placeholder: "normal"  },
    ],
    execute(data, config, event) {
      if (event !== "create") return data;
      const out = { ...data };
      for (let i = 1; i <= 2; i++) {
        const f = String(config[`field${i}`] ?? "").trim();
        const v = String(config[`value${i}`] ?? "").trim();
        if (f && v && (out[f] === undefined || out[f] === null || out[f] === "")) {
          out[f] = v;
        }
      }
      return out;
    },
  },

  {
    id:          "trim-whitespace",
    name:        "Trim Whitespace",
    description: "Strips leading and trailing whitespace from all string fields before saving.",
    icon:        "✂️",
    category:    "transform",
    configFields: [],
    execute(data) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        out[k] = typeof v === "string" ? v.trim() : v;
      }
      return out;
    },
  },

  {
    id:          "lowercase-email",
    name:        "Lowercase Email",
    description: "Forces all email-type fields to lowercase before saving.",
    icon:        "📧",
    category:    "transform",
    configFields: [
      { key: "field", label: "Field Name", type: "text", placeholder: "email", required: true },
    ],
    execute(data, config) {
      const f = String(config.field ?? "email");
      const v = data[f];
      if (typeof v === "string") return { ...data, [f]: v.toLowerCase() };
      return data;
    },
  },
];

export function getPlugin(id: string): Plugin | undefined {
  return PLUGINS.find((p) => p.id === id);
}
