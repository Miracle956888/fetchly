import { describe, expect, it } from "vitest";
import { renderLessonMarkdown } from "@/lib/markdown";

describe("renderLessonMarkdown", () => {
  it("renders headings, paragraphs and lists", () => {
    const html = renderLessonMarkdown("# Title\n\nSome text\n\n- one\n- two");
    expect(html).toContain("<h1");
    expect(html).toContain("Title</h1>");
    expect(html).toContain("<p>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
  });

  it("renders fenced code blocks without executing their content", () => {
    const html = renderLessonMarkdown("```js\nconst a = 1;\n```");
    expect(html).toContain('<pre data-lang="js">');
    expect(html).toContain("<code>");
    expect(html).toContain("const a = 1;");
  });

  it("escapes raw HTML so it can never execute (XSS)", () => {
    const html = renderLessonMarkdown('<script>alert("x")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes event-handler and attribute injection attempts", () => {
    // The whole tag is HTML-escaped, so the attribute text can never bind to a real element.
    const html = renderLessonMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain('<img src=x');
  });

  it("escapes HTML embedded inside inline code and bold", () => {
    const html = renderLessonMarkdown("Use `<b>bold</b>` and **<i>text</i>**.");
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("<strong>");
  });

  it("never emits a raw <script> tag for any of these payloads", () => {
    const payloads = [
      "<script>evil()</script>",
      "<SCRIPT>evil()</SCRIPT>",
      "<svg/onload=alert(1)>",
      "foo\n<script>bar</script>",
      "`<script>x</script>`",
    ];
    for (const p of payloads) {
      const html = renderLessonMarkdown(p);
      expect(html).not.toMatch(/<script/i);
    }
  });
});
