import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ── Editor bridge injected into HTML pages ────────────────────
const EDITOR_BRIDGE = `<script>
(function(){
  var patches = {};
  var editMode = false;
  var style = document.createElement('style');
  document.head.appendChild(style);

  function applyPatches(p) {
    patches = p || {};
    if (!Object.keys(patches).length) return;
    var walker = document.createTreeWalker(
      document.body || document.documentElement, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) {
      var t = (node.textContent || '').trim();
      if (t && patches[t] !== undefined) node.textContent = (node.textContent||'').replace(t, patches[t]);
    }
  }

  function isEditable(el) {
    if (!el || el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='META'||el.tagName==='LINK') return false;
    if (el.childElementCount > 0) return false;
    var t = (el.textContent||'').trim();
    return t.length > 0 && t.length < 400;
  }

  function enableEditMode() {
    style.textContent = '.__ge{cursor:pointer!important}.__ge:hover{outline:2px dashed #00C8F8!important;outline-offset:3px!important;background:rgba(0,200,248,.05)!important;border-radius:2px!important}';
    document.querySelectorAll('*').forEach(function(el){
      if(isEditable(el)){el.classList.add('__ge');el.addEventListener('click',startEdit,true);}
    });
  }
  function disableEditMode() {
    style.textContent='';
    document.querySelectorAll('.__ge').forEach(function(el){el.classList.remove('__ge');el.removeEventListener('click',startEdit,true);});
  }
  function startEdit(e) {
    e.preventDefault(); e.stopPropagation();
    var el=this, original=(el.textContent||'').trim();
    el.contentEditable='true';
    el.style.outline='2px solid #00C8F8'; el.style.outlineOffset='3px'; el.style.borderRadius='3px';
    el.focus();
    try{var r=document.createRange();r.selectNodeContents(el);var s=window.getSelection();s.removeAllRanges();s.addRange(r);}catch(x){}
    function finish(){
      el.removeEventListener('blur',finish); el.removeEventListener('keydown',onKey);
      el.contentEditable='false'; el.style.outline=''; el.style.outlineOffset=''; el.style.borderRadius='';
      var nv=(el.textContent||'').trim();
      if(nv&&nv!==original){patches[original]=nv;try{window.parent.postMessage({_g:1,t:'textpatch',original:original,value:nv},'*');}catch(x){}}
    }
    function onKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();el.blur();}if(e.key==='Escape'){el.textContent=original;el.blur();}}
    el.addEventListener('blur',finish); el.addEventListener('keydown',onKey);
  }

  window.addEventListener('message',function(ev){
    if(!ev.data||ev.data._g!==1)return;
    var d=ev.data;
    if(d.t==='init')applyPatches(d.patches||{});
    if(d.t==='editmode'){editMode=!!d.on;if(editMode)enableEditMode();else disableEditMode();}
  });
  setTimeout(function(){try{window.parent.postMessage({_g:1,t:'ready'},'*');}catch(x){}},500);
})();
</script>`;

// ── Rewrite all relative URLs in HTML to go through proxy ─────
function rewriteHtml(html: string, port: string): string {
  const proxy = (url: string) => {
    if (!url || url.startsWith("http") || url.startsWith("data:") ||
        url.startsWith("#") || url.startsWith("mailto:") || url.startsWith("javascript:")) return url;
    const normalized = url.startsWith("/") ? url : "/" + url;
    return `/api/preview-proxy?port=${port}&path=${encodeURIComponent(normalized)}`;
  };

  // src, href, action, data-src
  let out = html.replace(
    /(src|href|action|data-src)=(["'])([^"']*)\2/g,
    (_, attr, q, url) => `${attr}=${q}${proxy(url)}${q}`,
  );

  // srcset="url w, url w"
  out = out.replace(/srcset=(["'])([^"']*)\1/g, (_, q, srcset) => {
    const rewritten = srcset.split(",").map((part: string) => {
      const trimmed = part.trim();
      const spaceIdx = trimmed.search(/\s/);
      if (spaceIdx === -1) return proxy(trimmed);
      const url = trimmed.slice(0, spaceIdx);
      const rest = trimmed.slice(spaceIdx);
      return proxy(url) + rest;
    }).join(", ");
    return `srcset=${q}${rewritten}${q}`;
  });

  // CSS url() in <style> blocks and inline style=""
  out = out.replace(/url\((["']?)([^"')]+)\1\)/g, (_, q, url) => `url(${q}${proxy(url)}${q})`);

  return out;
}

// ── Main proxy handler (all methods) ─────────────────────────
async function handler(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const port   = searchParams.get("port") ?? "4000";
  const path   = searchParams.get("path") ?? "/";
  const method = req.method;

  try {
    const target = `http://localhost:${port}${path}`;

    const fwdHeaders: Record<string, string> = {
      "Accept":     req.headers.get("accept")     ?? "*/*",
      "User-Agent": req.headers.get("user-agent") ?? "Genesis-Proxy/1.0",
    };
    const cookie = req.headers.get("cookie");
    if (cookie) fwdHeaders["Cookie"] = cookie;
    const ct = req.headers.get("content-type");
    if (ct) fwdHeaders["Content-Type"] = ct;
    const referer = req.headers.get("referer");
    if (referer) {
      // Rewrite referer back to the real origin
      fwdHeaders["Referer"] = `http://localhost:${port}/`;
    }

    const body = (method !== "GET" && method !== "HEAD")
      ? await req.arrayBuffer() : undefined;

    const res = await fetch(target, {
      method,
      headers: fwdHeaders,
      body,
      redirect: "manual", // we rewrite redirects ourselves
    });

    const resContentType = res.headers.get("content-type") ?? "text/html";
    const isHtml = resContentType.includes("text/html");

    // Build response headers
    const outHeaders = new Headers();
    outHeaders.set("Content-Type", resContentType);
    outHeaders.set("X-Frame-Options", "SAMEORIGIN");

    // Forward Set-Cookie — strip Domain so it attaches to proxy origin
    res.headers.forEach((val, key) => {
      if (key.toLowerCase() === "set-cookie") {
        const cleaned = val
          .replace(/Domain=[^;,]+;?\s*/gi, "")
          .replace(/SameSite=Strict/gi,    "SameSite=Lax")
          .replace(/SameSite=None/gi,      "SameSite=Lax")
          .replace(/Secure;?\s*/gi,        "");
        outHeaders.append("Set-Cookie", cleaned);
      }
    });

    // Handle redirects
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") ?? "/";
      const isAbs = loc.startsWith("http");
      const redirectPath = isAbs ? new URL(loc).pathname + new URL(loc).search : loc;
      outHeaders.set("Location", `/api/preview-proxy?port=${port}&path=${encodeURIComponent(redirectPath)}`);
      return new NextResponse(null, { status: res.status, headers: outHeaders });
    }

    const text = await res.text();

    if (isHtml) {
      const rewritten = rewriteHtml(text, port);
      const final = rewritten.includes("</body>")
        ? rewritten.replace("</body>", EDITOR_BRIDGE + "</body>")
        : rewritten + EDITOR_BRIDGE;
      return new NextResponse(final, { status: res.status, headers: outHeaders });
    }

    // CSS files — also rewrite url() inside them
    if (resContentType.includes("text/css")) {
      const rewrittenCss = text.replace(
        /url\((["']?)([^"')]+)\1\)/g,
        (_, q, url) => {
          if (!url || url.startsWith("data:") || url.startsWith("http")) return _;
          const normalized = url.startsWith("/") ? url : "/" + url;
          return `url(${q}/api/preview-proxy?port=${port}&path=${encodeURIComponent(normalized)}${q})`;
        },
      );
      return new NextResponse(rewrittenCss, { status: res.status, headers: outHeaders });
    }

    return new NextResponse(text, { status: res.status, headers: outHeaders });

  } catch {
    return new NextResponse(
      `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0d1117;color:#64748b">
        <div style="text-align:center">
          <p style="font-size:14px;margin-bottom:8px">Preview server not running</p>
          <p style="font-size:12px">Click <strong style="color:#00C8F8">Launch</strong> in the toolbar above</p>
        </div>
      </body></html>`,
      { status: 502, headers: { "Content-Type": "text/html" } },
    );
  }
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
