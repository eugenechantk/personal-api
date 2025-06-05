import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  BulletedListItemBlockObjectResponse,
  CodeBlockObjectResponse,
  Heading1BlockObjectResponse,
  Heading2BlockObjectResponse,
  Heading3BlockObjectResponse,
  NumberedListItemBlockObjectResponse,
  ParagraphBlockObjectResponse,
  RichTextItemResponse,
  TextRichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { config } from "dotenv";
import { resolve } from "path";
import { NotionService } from "../src/services/notion";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), ".env") });

describe("NotionService", () => {
  let notionService: NotionService;
  let testPageId: string | null = null;
  const TEST_DATABASE_ID = process.env.NOTION_DATABASE_ID;
  const NOTION_API_KEY = process.env.NOTION_API_KEY;

  beforeAll(() => {
    if (!NOTION_API_KEY || !TEST_DATABASE_ID) {
      throw new Error(
        "Missing required environment variables: NOTION_API_KEY or NOTION_DATABASE_ID"
      );
    }
    notionService = new NotionService(NOTION_API_KEY, TEST_DATABASE_ID);
  });

  test("should create a test page, append markdown content, and verify formatting", async () => {
    // Create a test page
    const client = new Client({ auth: NOTION_API_KEY! });
    const response = await client.pages.create({
      parent: { database_id: TEST_DATABASE_ID! },
      properties: {
        title: {
          title: [
            {
              text: {
                content: "Test Daily Note",
              },
            },
          ],
        },
        Type: {
          select: {
            name: "Daily Note",
          },
        },
      },
    });
    testPageId = response.id;

    // Test content with various markdown elements
    const testContent = `# Heading 1
## Heading 2
### Heading 3

This is a paragraph with a [[https://example.com]] link.

- Bullet point 1
- Bullet point 2

1. Numbered item 1
2. Numbered item 2

\`\`\`
const code = "block";
console.log(code);
\`\`\``;

    // Find today's page and use it for appending
    const foundPageId = await notionService.findTodayPage();
    expect(foundPageId).toBe(testPageId);

    // Append content to the page
    await notionService.appendToPage(foundPageId!, testContent);

    // Verify the content was added correctly
    const blocks = await client.blocks.children.list({
      block_id: foundPageId!,
    });

    const results = blocks.results as BlockObjectResponse[];

    // Type guards
    const isHeading1 = (
      block: BlockObjectResponse
    ): block is Heading1BlockObjectResponse => block.type === "heading_1";
    const isHeading2 = (
      block: BlockObjectResponse
    ): block is Heading2BlockObjectResponse => block.type === "heading_2";
    const isHeading3 = (
      block: BlockObjectResponse
    ): block is Heading3BlockObjectResponse => block.type === "heading_3";
    const isParagraph = (
      block: BlockObjectResponse
    ): block is ParagraphBlockObjectResponse => block.type === "paragraph";
    const isBulletedListItem = (
      block: BlockObjectResponse
    ): block is BulletedListItemBlockObjectResponse =>
      block.type === "bulleted_list_item";
    const isNumberedListItem = (
      block: BlockObjectResponse
    ): block is NumberedListItemBlockObjectResponse =>
      block.type === "numbered_list_item";
    const isCode = (
      block: BlockObjectResponse
    ): block is CodeBlockObjectResponse => block.type === "code";
    const isTextRichText = (
      richText: RichTextItemResponse
    ): richText is TextRichTextItemResponse => richText.type === "text";

    // console.log(JSON.stringify(results, null, 2));

    // Verify heading 1
    expect(results[0].type).toBe("heading_1");
    if (
      isHeading1(results[0]) &&
      isTextRichText(results[0].heading_1.rich_text[0])
    ) {
      expect(results[0].heading_1.rich_text[0].text.content).toBe("Heading 1");
    }

    // Verify heading 2
    expect(results[1].type).toBe("heading_2");
    if (
      isHeading2(results[1]) &&
      isTextRichText(results[1].heading_2.rich_text[0])
    ) {
      expect(results[1].heading_2.rich_text[0].text.content).toBe("Heading 2");
    }

    // Verify heading 3
    expect(results[2].type).toBe("heading_3");
    if (
      isHeading3(results[2]) &&
      isTextRichText(results[2].heading_3.rich_text[0])
    ) {
      expect(results[2].heading_3.rich_text[0].text.content).toBe("Heading 3");
    }

    // Verify empty paragraph after heading 3
    expect(results[3].type).toBe("paragraph");
    if (isParagraph(results[3])) {
      expect(results[3].paragraph.rich_text).toEqual([]);
      expect(results[3].paragraph.color).toBe("default");
    }

    // Verify paragraph with link
    expect(results[4].type).toBe("paragraph");
    if (isParagraph(results[4])) {
      const paragraphText = results[4].paragraph.rich_text;
      if (
        isTextRichText(paragraphText[0]) &&
        isTextRichText(paragraphText[1])
      ) {
        expect(paragraphText[0].text.content).toBe(
          "This is a paragraph with a "
        );
        expect(paragraphText[1].text.content).toBe("https://example.com");
        expect(paragraphText[1].text.link?.url).toBe("https://example.com/");
      }
    }

    // Verify empty paragraph after paragraph with link
    expect(results[5].type).toBe("paragraph");
    if (isParagraph(results[5])) {
      expect(results[5].paragraph.rich_text).toEqual([]);
      expect(results[5].paragraph.color).toBe("default");
    }

    // Verify bullet points
    expect(results[6].type).toBe("bulleted_list_item");
    if (isBulletedListItem(results[6])) {
      const richText = results[6].bulleted_list_item.rich_text;
      if (isTextRichText(richText[0])) {
        expect(richText[0].text.content).toBe("Bullet point 1");
      }
    }

    expect(results[7].type).toBe("bulleted_list_item");
    if (isBulletedListItem(results[7])) {
      const richText = results[7].bulleted_list_item.rich_text;
      if (isTextRichText(richText[0])) {
        expect(richText[0].text.content).toBe("Bullet point 2");
      }
    }

    // Verify empty paragraph after bullet points
    expect(results[8].type).toBe("paragraph");
    if (isParagraph(results[8])) {
      expect(results[8].paragraph.rich_text).toEqual([]);
      expect(results[8].paragraph.color).toBe("default");
    }

    // Verify numbered list
    expect(results[9].type).toBe("numbered_list_item");
    if (isNumberedListItem(results[9])) {
      const richText = results[9].numbered_list_item.rich_text;
      if (isTextRichText(richText[0])) {
        expect(richText[0].text.content).toBe("Numbered item 1");
      }
    }

    expect(results[10].type).toBe("numbered_list_item");
    if (isNumberedListItem(results[10])) {
      const richText = results[10].numbered_list_item.rich_text;
      if (isTextRichText(richText[0])) {
        expect(richText[0].text.content).toBe("Numbered item 2");
      }
    }

    // Verify empty paragraph after numbered list
    expect(results[11].type).toBe("paragraph");
    if (isParagraph(results[11])) {
      expect(results[11].paragraph.rich_text).toEqual([]);
      expect(results[11].paragraph.color).toBe("default");
    }

    // Verify code block
    expect(results[12].type).toBe("code");
    if (isCode(results[12]) && isTextRichText(results[12].code.rich_text[0])) {
      expect(results[12].code.rich_text[0].text.content).toBe(
        'const code = "block";\nconsole.log(code);'
      );
    }
  }, 30000); // Increase timeout to 30 seconds for API calls

  afterAll(async () => {
    // // Clean up: Delete the test page
    if (testPageId) {
      const client = new Client({ auth: NOTION_API_KEY! });
      await client.pages.update({
        page_id: testPageId,
        archived: true,
      });
    }
  });
});
