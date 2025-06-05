import { NotionService } from "./services/notion";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  throw new Error(
    "Missing required environment variables: NOTION_API_KEY or NOTION_DATABASE_ID"
  );
}

const notionService = new NotionService(NOTION_API_KEY, NOTION_DATABASE_ID);

Bun.serve({
  port,
  routes: {
    "/health": Response.json({ status: "ok" }),
    "/append-note": async (request) => {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      try {
        const { content } = await request.json();

        if (!content || typeof content !== "string") {
          return new Response("Invalid request body", { status: 400 });
        }

        const pageId = await notionService.findTodayPage();

        if (!pageId) {
          return new Response("Today's page not found", { status: 404 });
        }

        await notionService.appendToPage(pageId, content);
        return new Response("Note appended successfully", { status: 200 });
      } catch (error) {
        console.error("Error handling request:", error);
        return new Response("Internal server error", { status: 500 });
      }
    },
  },
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`HTTP server running on http://localhost:${port}`);
