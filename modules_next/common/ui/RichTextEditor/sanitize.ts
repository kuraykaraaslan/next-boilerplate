/* =========================================================
   PASTE SANITIZER
   Strips Word / Google Docs cruft: classes, inline styles, MSO
   comments, <o:p> elements, font tags. Keeps semantic markup
   Quill can re-parse.
========================================================= */

export function sanitizePastedHTML(html: string): string {
  if (!html) return '';
  let s = html;
  // Strip MS Office conditional comments + all comments
  s = s.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // Strip <o:p>, <w:*>, etc.
  s = s.replace(/<\/?(o|w|m|v):[^>]+>/gi, '');
  // Strip <style> and <script> blocks
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Strip class and style attributes from any tag
  s = s.replace(/\s(class|style|lang|dir|xml:lang|xmlns(?::\w+)?)="[^"]*"/gi, '');
  // Convert <font> to plain text
  s = s.replace(/<\/?font[^>]*>/gi, '');
  // Drop empty paragraphs that GDocs adds
  s = s.replace(/<p>\s*<\/p>/gi, '');
  return s;
}

/* =========================================================
   IMAGE UPLOAD HELPER
   Prefers the supplied `upload` callback (e.g. CDN); falls
   back to inlining as base64 via FileReader.
========================================================= */

export async function resolveImageSrc(
  file: File,
  upload?: (f: File) => Promise<string>,
): Promise<string> {
  if (upload) {
    try { return await upload(file); } catch { /* fall through */ }
  }
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Failed to read file.'));
    r.readAsDataURL(file);
  });
}
