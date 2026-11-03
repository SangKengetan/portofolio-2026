import sanitizeHtml from "sanitize-html";

/**
 * Rich-text blocks come from Tiptap and are rendered with dangerouslySetInnerHTML on the website,
 * so the HTML is sanitised here, before it is stored (allow-list, not block-list).
 */
const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h2", "h3", "h4", "strong", "em", "u", "s", "code", "pre", "blockquote",
    "ul", "ol", "li", "a", "span", "sub", "sup",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    code: ["class"],
    pre: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  allowedClasses: { code: [/^language-[\w-]+$/], pre: [/^language-[\w-]+$/] },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        // Links that open a new tab must not hand window.opener to the target page.
        ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
      },
    }),
  },
};

export const sanitizeRichText = (html: string): string => sanitizeHtml(html, options);
