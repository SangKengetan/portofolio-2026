import { describe, expect, it } from "vitest";
import { blockInput, isAllowedEmbed, toPublicBlock } from "../../src/modules/projects/blocks";
import type { MediaMap } from "../../src/modules/media/media.mapper";

const ID_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const media: MediaMap = {
  get: (id) => (id === ID_A || id === ID_B ? { id, url: `https://cdn.test/${id}.webp`, alt: "alt", width: 100, height: 50 } : null),
  getRow: () => null,
};

describe("embed allow-list", () => {
  it.each([
    ["figma", "https://www.figma.com/proto/abc", true],
    ["figma", "https://evil.com/figma.com", false],
    ["figma", "https://figma.com.evil.com/x", false],
    ["figma", "http://www.figma.com/proto/abc", false],
    ["youtube", "https://youtu.be/dQw4w9WgXcQ", true],
    ["youtube", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", true],
    ["tableau", "https://public.tableau.com/views/x/y", true],
    ["looker", "https://lookerstudio.google.com/reporting/1", true],
    ["looker", "javascript:alert(1)", false],
  ] as const)("%s %s → %s", (provider, url, allowed) => {
    expect(isAllowedEmbed(provider, url)).toBe(allowed);
  });
});

describe("blockInput", () => {
  it("accepts every block type and applies defaults", () => {
    const parsed = blockInput.parse({ type: "image", data: { mediaId: ID_A } });
    expect(parsed).toMatchObject({ type: "image", heading: null, data: { frame: "browser", caption: null } });
    expect(blockInput.parse({ type: "list", data: { items: ["a"] } })).toMatchObject({ data: { style: "bullet" } });
    expect(blockInput.parse({ type: "gallery", data: { items: [{ mediaId: ID_A }] } })).toMatchObject({ data: { columns: 2 } });
  });

  it("sanitises rich text on the way in", () => {
    const parsed = blockInput.parse({ type: "rich_text", data: { html: '<p>ok</p><script>alert(1)</script>' } });
    expect(parsed.type === "rich_text" && parsed.data.html).toBe("<p>ok</p>");
  });

  it("rejects unknown types, bad ids, foreign embed hosts and empty lists", () => {
    expect(blockInput.safeParse({ type: "html", data: {} }).success).toBe(false);
    expect(blockInput.safeParse({ type: "image", data: { mediaId: "nope" } }).success).toBe(false);
    expect(blockInput.safeParse({ type: "list", data: { items: [] } }).success).toBe(false);
    const embed = blockInput.safeParse({ type: "embed", data: { provider: "figma", url: "https://evil.example/x" } });
    expect(embed.success).toBe(false);
    if (!embed.success) expect(embed.error.issues[0]!.path).toEqual(["data", "url"]);
    expect(blockInput.safeParse({ type: "embed", data: { provider: "figma", url: "https://www.figma.com/file/1" } }).success).toBe(true);
  });
});

describe("toPublicBlock", () => {
  it("resolves media ids to the objects the website expects", () => {
    const image = toPublicBlock(
      { id: "1", type: "image", heading: "Hero", data: { mediaId: ID_A, caption: "Cap", frame: "device" } },
      media,
    );
    expect(image).toEqual({
      id: "1",
      type: "image",
      heading: "Hero",
      data: { media: expect.objectContaining({ id: ID_A, url: expect.stringContaining(ID_A) }), caption: "Cap", frame: "device" },
    });

    const ba = toPublicBlock({ id: "2", type: "before_after", heading: null, data: { beforeMediaId: ID_A, afterMediaId: ID_B, caption: null } }, media);
    expect(ba).toMatchObject({ type: "before_after", data: { before: { id: ID_A }, after: { id: ID_B } } });
    expect(ba && "caption" in ba.data).toBe(false);
  });

  it("drops blocks whose images no longer exist instead of breaking the page", () => {
    expect(toPublicBlock({ id: "1", type: "image", heading: null, data: { mediaId: "gone" } }, media)).toBeNull();
    const gallery = toPublicBlock(
      { id: "2", type: "gallery", heading: null, data: { items: [{ mediaId: ID_A }, { mediaId: "gone" }], columns: 3 } },
      media,
    );
    expect(gallery).toMatchObject({ type: "gallery", data: { columns: 3, items: [{ media: { id: ID_A } }] } });
    expect(toPublicBlock({ id: "3", type: "gallery", heading: null, data: { items: [{ mediaId: "gone" }] } }, media)).toBeNull();
  });
});
