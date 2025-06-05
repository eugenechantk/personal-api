import { Client } from "@notionhq/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export class NotionService {
  private client: Client;
  private databaseId: string;

  constructor(apiKey: string, databaseId: string) {
    console.log("Initializing NotionService with database ID:", databaseId);
    this.client = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }

  private getDateString(date: dayjs.Dayjs): string {
    const dateStr = date.tz("Asia/Hong_Kong").format("DD/MM/YYYY");
    console.log("Generated date string:", dateStr);
    return dateStr;
  }

  private async findPageByDate(dateStr: string): Promise<string | null> {
    console.log("Searching for page with date:", dateStr);
    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              property: "topic",
              select: {
                equals: "Daily Note",
              },
            },
            {
              property: "created",
              date: {
                equals: dateStr,
              },
            },
          ],
        },
      });

      if (response.results.length === 0) {
        console.log("No page found for date:", dateStr);
        return null;
      }

      console.log(
        "Found page for date:",
        dateStr,
        "with ID:",
        response.results[0].id
      );
      return response.results[0].id;
    } catch (error) {
      console.error(`Error finding page for date ${dateStr}:`, error);
      throw error;
    }
  }

  async findTodayPage(): Promise<string | null> {
    console.log("Starting search for today's page");
    try {
      // Try to find today's page
      const today = dayjs();
      const todayStr = this.getDateString(today);
      console.log("Looking for today's page:", todayStr);
      const todayPage = await this.findPageByDate(todayStr);

      if (todayPage) {
        console.log("Found today's page:", todayPage);
        return todayPage;
      }

      // If today's page not found, try yesterday's page
      const yesterday = today.subtract(1, "day");
      const yesterdayStr = this.getDateString(yesterday);
      console.log(
        "Today's page not found, trying yesterday's page:",
        yesterdayStr
      );
      const yesterdayPage = await this.findPageByDate(yesterdayStr);

      if (yesterdayPage) {
        console.log(
          `Today's page not found. Using yesterday's page (${yesterdayStr}) instead.`
        );
        return yesterdayPage;
      }

      console.log("No page found for today or yesterday");
      return null;
    } catch (error) {
      console.error("Error finding today's or yesterday's page:", error);
      throw error;
    }
  }

  private parseTextWithLinks(text: string): any[] {
    console.log("Parsing text with links:", text);
    const richText: any[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      const openBracketIndex = text.indexOf("[[", currentIndex);

      if (openBracketIndex === -1) {
        // No more links, add remaining text
        if (currentIndex < text.length) {
          richText.push({
            text: {
              content: text.slice(currentIndex),
            },
          });
        }
        break;
      }

      // Add text before the link
      if (openBracketIndex > currentIndex) {
        richText.push({
          text: {
            content: text.slice(currentIndex, openBracketIndex),
          },
        });
      }

      // Find the closing double bracket
      const closeBracketIndex = text.indexOf("]]", openBracketIndex);
      if (closeBracketIndex === -1) {
        // No closing bracket, treat the rest as regular text
        richText.push({
          text: {
            content: text.slice(openBracketIndex),
          },
        });
        break;
      }

      // Extract link text and add it as a link
      const linkText = text.slice(openBracketIndex + 2, closeBracketIndex);
      // Remove trailing slash if present and ensure consistent URL format
      const cleanLinkText = linkText.replace(/\/$/, "");
      console.log("Found link:", cleanLinkText);
      richText.push({
        text: {
          content: cleanLinkText,
          link: {
            url: cleanLinkText,
          },
        },
      });

      currentIndex = closeBracketIndex + 2;
    }

    console.log("Parsed rich text:", richText);
    return richText;
  }

  private isNumberedListItem(line: string): boolean {
    const isNumbered = /^\d+\.\s/.test(line);
    if (isNumbered) {
      console.log("Found numbered list item:", line);
    }
    return isNumbered;
  }

  private parseMarkdownToBlocks(content: string): any[] {
    console.log("Starting to parse markdown content");
    const lines = content.split("\n");
    const blocks: any[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage: string = "typescript";

    for (let line of lines) {
      // Handle code blocks
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          console.log("Closing code block with language:", codeBlockLanguage);
          blocks.push({
            code: {
              rich_text: [
                {
                  text: {
                    content: codeBlockContent.join("\n"),
                  },
                },
              ],
              language: codeBlockLanguage,
            },
          });
          inCodeBlock = false;
          codeBlockContent = [];
        } else {
          inCodeBlock = true;
          // Check if language is specified after ```
          const language = line.slice(3).trim();
          if (language) {
            console.log("Starting code block with language:", language);
            codeBlockContent = [];
            codeBlockLanguage = language;
          } else {
            console.log(
              "Starting code block with default language: typescript"
            );
            codeBlockContent = [];
            codeBlockLanguage = "typescript";
          }
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle headings
      if (line.startsWith("# ")) {
        console.log("Found heading 1:", line.substring(2));
        blocks.push({
          heading_1: {
            rich_text: this.parseTextWithLinks(line.substring(2)),
          },
        });
        continue;
      }
      if (line.startsWith("## ")) {
        console.log("Found heading 2:", line.substring(3));
        blocks.push({
          heading_2: {
            rich_text: this.parseTextWithLinks(line.substring(3)),
          },
        });
        continue;
      }
      if (line.startsWith("### ")) {
        console.log("Found heading 3:", line.substring(4));
        blocks.push({
          heading_3: {
            rich_text: this.parseTextWithLinks(line.substring(4)),
          },
        });
        continue;
      }

      // Handle bullet lists
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const content = line.substring(2);
        console.log("Found bullet list item:", content);
        blocks.push({
          bulleted_list_item: {
            rich_text: this.parseTextWithLinks(content),
            color: "default",
          },
        });
        continue;
      }

      // Handle numbered lists
      if (this.isNumberedListItem(line)) {
        const content = line.replace(/^\d+\.\s/, "");
        blocks.push({
          numbered_list_item: {
            rich_text: this.parseTextWithLinks(content),
            color: "default",
          },
        });
        continue;
      }

      // Handle regular paragraphs
      if (line.trim() !== "") {
        console.log("Found paragraph:", line);
        blocks.push({
          paragraph: {
            rich_text: this.parseTextWithLinks(line),
          },
        });
      } else {
        console.log("Found empty line, adding empty paragraph block");
        blocks.push({
          paragraph: {
            rich_text: [],
            color: "default",
          },
        });
      }
    }

    console.log("Finished parsing markdown, generated blocks:", blocks.length);
    return blocks;
  }

  async appendToPage(pageId: string, content: string): Promise<void> {
    console.log("Starting to append content to page:", pageId);
    try {
      const blocks = this.parseMarkdownToBlocks(content);
      console.log("Appending blocks to page:", blocks.length, "blocks");
      await this.client.blocks.children.append({
        block_id: pageId,
        children: blocks,
      });
      console.log("Successfully appended blocks to page");
    } catch (error) {
      console.error("Error appending to page:", error);
      throw error;
    }
  }

  async getPageBlocks(pageId: string): Promise<any[]> {
    console.log("Fetching blocks for page:", pageId);
    try {
      const blocks: any[] = [];
      let hasMore = true;
      let startCursor: string | undefined;
      let pageCount = 0;

      while (hasMore) {
        pageCount++;
        console.log(`Fetching page ${pageCount} of blocks`);
        const response = await this.client.blocks.children.list({
          block_id: pageId,
          start_cursor: startCursor,
        });

        blocks.push(...response.results);
        console.log(
          `Retrieved ${response.results.length} blocks in page ${pageCount}`
        );
        hasMore = response.has_more;
        startCursor = response.next_cursor || undefined;
      }

      console.log("Finished fetching all blocks, total count:", blocks.length);
      return blocks;
    } catch (error) {
      console.error(`Error getting blocks for page ${pageId}:`, error);
      throw error;
    }
  }
}
