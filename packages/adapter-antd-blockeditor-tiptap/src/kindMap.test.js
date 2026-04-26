import { describe, it, expect } from "vitest";
import {
  blockToTiptapDoc,
  tiptapDocToText,
  tiptapDocToKind,
  tiptapNodeForKind,
} from "./kindMap.js";

describe("tiptapNodeForKind", () => {
  it("paragraph → ProseMirror paragraph", () => {
    expect(tiptapNodeForKind("paragraph")).toEqual({ type: "paragraph" });
  });
  it("heading-2 → heading с level=2", () => {
    expect(tiptapNodeForKind("heading-2")).toEqual({ type: "heading", attrs: { level: 2 } });
  });
  it("divider → horizontalRule", () => {
    expect(tiptapNodeForKind("divider")).toEqual({ type: "horizontalRule" });
  });
  it("неизвестный kind → fallback paragraph", () => {
    expect(tiptapNodeForKind("unknown-kind")).toEqual({ type: "paragraph" });
  });
});

describe("blockToTiptapDoc", () => {
  it("paragraph с content", () => {
    const doc = blockToTiptapDoc({ id: "1", kind: "paragraph", content: "hi" });
    expect(doc).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
    });
  });

  it("paragraph с пустым content → paragraph без content[]", () => {
    const doc = blockToTiptapDoc({ id: "1", kind: "paragraph", content: "" });
    expect(doc.content[0].type).toBe("paragraph");
    expect(doc.content[0].content).toEqual([]);
  });

  it("heading-1", () => {
    const doc = blockToTiptapDoc({ id: "h", kind: "heading-1", content: "Title" });
    expect(doc.content[0].type).toBe("heading");
    expect(doc.content[0].attrs).toEqual({ level: 1 });
    expect(doc.content[0].content[0].text).toBe("Title");
  });

  it("bulleted-list-item → bulletList > listItem > paragraph", () => {
    const doc = blockToTiptapDoc({ id: "b", kind: "bulleted-list-item", content: "x" });
    expect(doc.content[0].type).toBe("bulletList");
    expect(doc.content[0].content[0].type).toBe("listItem");
    expect(doc.content[0].content[0].content[0].type).toBe("paragraph");
  });

  it("to-do с checked → taskList > taskItem.attrs.checked=true", () => {
    const doc = blockToTiptapDoc({ id: "t", kind: "to-do", content: "buy", props: { checked: true } });
    expect(doc.content[0].type).toBe("taskList");
    expect(doc.content[0].content[0].attrs.checked).toBe(true);
  });

  it("to-do без checked → checked=false", () => {
    const doc = blockToTiptapDoc({ id: "t", kind: "to-do", content: "x" });
    expect(doc.content[0].content[0].attrs.checked).toBe(false);
  });

  it("code → codeBlock", () => {
    const doc = blockToTiptapDoc({ id: "c", kind: "code", content: "ls -la" });
    expect(doc.content[0].type).toBe("codeBlock");
    expect(doc.content[0].content[0].text).toBe("ls -la");
  });

  it("divider → horizontalRule, content игнорируется", () => {
    const doc = blockToTiptapDoc({ id: "d", kind: "divider", content: "ignored" });
    expect(doc.content[0].type).toBe("horizontalRule");
  });

  it("blockquote", () => {
    const doc = blockToTiptapDoc({ id: "q", kind: "quote", content: "carpe diem" });
    expect(doc.content[0].type).toBe("blockquote");
  });
});

describe("tiptapDocToText", () => {
  it("извлекает text node", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }] };
    expect(tiptapDocToText(doc)).toBe("hello");
  });

  it("конкатенирует marked text (bold + plain)", () => {
    const doc = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "plain " },
          { type: "text", marks: [{ type: "bold" }], text: "bold" },
          { type: "text", text: " end" },
        ],
      }],
    };
    expect(tiptapDocToText(doc)).toBe("plain bold end");
  });

  it("walks вложенные списки", () => {
    const doc = blockToTiptapDoc({ id: "x", kind: "bulleted-list-item", content: "item 1" });
    expect(tiptapDocToText(doc)).toBe("item 1");
  });

  it("пустой doc → ''", () => {
    expect(tiptapDocToText({ type: "doc", content: [] })).toBe("");
    expect(tiptapDocToText(null)).toBe("");
    expect(tiptapDocToText(undefined)).toBe("");
  });
});

describe("tiptapDocToKind", () => {
  it("распознаёт все base kind'ы", () => {
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "paragraph", content: "x" }))).toBe("paragraph");
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "heading-1", content: "x" }))).toBe("heading-1");
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "heading-2", content: "x" }))).toBe("heading-2");
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "heading-3", content: "x" }))).toBe("heading-3");
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "bulleted-list-item", content: "x" }))).toBe("bulleted-list-item");
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "numbered-list-item", content: "x" }))).toBe("numbered-list-item");
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "to-do", content: "x" }))).toBe("to-do");
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "quote", content: "x" }))).toBe("quote");
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "code", content: "x" }))).toBe("code");
    expect(tiptapDocToKind(blockToTiptapDoc({ kind: "divider" }))).toBe("divider");
  });

  it("пустой / null → null", () => {
    expect(tiptapDocToKind({})).toBe(null);
    expect(tiptapDocToKind(null)).toBe(null);
  });

  it("heading без level → heading-1 default", () => {
    const doc = { type: "doc", content: [{ type: "heading", content: [] }] };
    expect(tiptapDocToKind(doc)).toBe("heading-1");
  });
});
