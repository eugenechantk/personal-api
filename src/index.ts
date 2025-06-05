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
    "/notion/append-daily-note": async (request) => {
      console.log("Received request to append daily note");

      if (request.method !== "POST") {
        console.log("Invalid method:", request.method);
        return new Response("Method not allowed", { status: 405 });
      }

      try {
        console.log("Parsing request body");
        const { content } = await request.json();

        if (!content || typeof content !== "string") {
          console.log("Invalid content:", { content });
          return new Response("Invalid request body", { status: 400 });
        }

        const pageId = await notionService.findTodayPage();
        console.log("Found today's page!");

        if (!pageId) {
          return new Response("Today's page not found", { status: 404 });
        }

        await notionService.appendToPage(pageId, content);
        console.log("Note appended successfully");
        return new Response("Note appended successfully", { status: 200 });
      } catch (error) {
        console.error("Error handling request:", error);
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
          });
        }
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  },
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`HTTP server running on http://localhost:${port}`);
