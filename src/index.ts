import { AIService } from "./services/ai";
import { NotionService } from "./services/notion";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  throw new Error(
    "Missing required environment variables: NOTION_API_KEY or NOTION_DATABASE_ID"
  );
}

if (!GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error(
    "Missing required environment variable: GOOGLE_GENERATIVE_AI_API_KEY"
  );
}

const notionService = new NotionService(NOTION_API_KEY, NOTION_DATABASE_ID);
const aiService = new AIService(GOOGLE_GENERATIVE_AI_API_KEY);

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
    "/ai/assistant": async (request) => {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      console.log("Received request to generate AI response");

      try {
        const { prompt, image } = await request.json();

        if (!prompt || typeof prompt !== "string") {
          console.error("Received invalid prompt. Abort");
          return new Response("Invalid prompt", { status: 400 });
        }

        if (image && typeof image !== "string") {
          console.error("Received invalid image. Abort");
          return new Response("Invalid image format", { status: 400 });
        }

        const result = await aiService.generateResponse({ prompt, image });
        return Response.json(result);
      } catch (error) {
        console.error("Error handling AI request:", error);
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
