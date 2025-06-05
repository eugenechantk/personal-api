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
    this.client = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }

  private getDateString(date: dayjs.Dayjs): string {
    return date.tz("Asia/Hong_Kong").format("DD/MM/YYYY");
  }

  private async findPageByDate(dateStr: string): Promise<string | null> {
    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        filter: {
          property: "title",
          title: {
            equals: dateStr,
          },
        },
      });

      if (response.results.length === 0) {
        return null;
      }

      return response.results[0].id;
    } catch (error) {
      console.error(`Error finding page for date ${dateStr}:`, error);
      throw error;
    }
  }

  async findTodayPage(): Promise<string | null> {
    try {
      // Try to find today's page
      const today = dayjs();
      const todayStr = this.getDateString(today);
      const todayPage = await this.findPageByDate(todayStr);

      if (todayPage) {
        return todayPage;
      }

      // If today's page not found, try yesterday's page
      const yesterday = today.subtract(1, "day");
      const yesterdayStr = this.getDateString(yesterday);
      const yesterdayPage = await this.findPageByDate(yesterdayStr);

      if (yesterdayPage) {
        console.log(
          `Today's page not found. Using yesterday's page (${yesterdayStr}) instead.`
        );
        return yesterdayPage;
      }

      return null;
    } catch (error) {
      console.error("Error finding today's or yesterday's page:", error);
      throw error;
    }
  }

  private parseTextWithLinks(text: string): any[] {
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

    return richText;
  }

  private isNumberedListItem(line: string): boolean {
    return /^\d+\.\s/.test(line);
  }

  private parseMarkdownToBlocks(content: string): any[] {
    const lines = content.split("\n");
    const blocks: any[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage: string = "typescript";

    for (let line of lines) {
      // Handle code blocks
      if (line.startsWith("```")) {
        if (inCodeBlock) {
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
            // Store the language for when we close the code block
            codeBlockContent = [];
            codeBlockLanguage = language;
          } else {
            codeBlockContent = [];
            codeBlockLanguage = "typescript"; // Default to typescript
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
        blocks.push({
          heading_1: {
            rich_text: this.parseTextWithLinks(line.substring(2)),
          },
        });
        continue;
      }
      if (line.startsWith("## ")) {
        blocks.push({
          heading_2: {
            rich_text: this.parseTextWithLinks(line.substring(3)),
          },
        });
        continue;
      }
      if (line.startsWith("### ")) {
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
        blocks.push({
          paragraph: {
            rich_text: this.parseTextWithLinks(line),
          },
        });
      } else {
        // Add empty paragraph block for line breaks
        blocks.push({
          paragraph: {
            rich_text: [],
            color: "default",
          },
        });
      }
    }

    return blocks;
  }

  async appendToPage(pageId: string, content: string): Promise<void> {
    try {
      const blocks = this.parseMarkdownToBlocks(content);
      await this.client.blocks.children.append({
        block_id: pageId,
        children: blocks,
      });
    } catch (error) {
      console.error("Error appending to page:", error);
      throw error;
    }
  }

  async getPageBlocks(pageId: string): Promise<any[]> {
    try {
      const blocks: any[] = [];
      let hasMore = true;
      let startCursor: string | undefined;

      while (hasMore) {
        const response = await this.client.blocks.children.list({
          block_id: pageId,
          start_cursor: startCursor,
        });

        blocks.push(...response.results);
        hasMore = response.has_more;
        startCursor = response.next_cursor || undefined;
      }

      return blocks;
    } catch (error) {
      console.error(`Error getting blocks for page ${pageId}:`, error);
      throw error;
    }
  }
}
