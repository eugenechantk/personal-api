import { afterAll, beforeAll, describe, expect, it } from "bun:test";

describe("OpenAI API Route", () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    // Check if API key is set
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    // Set port for testing
    process.env.PORT = "3001";

    // Start the server by importing the index file
    await import("../../index.ts");
    baseUrl = "http://localhost:3001";

    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // The server will be stopped when the process ends
  });

  describe("POST /ai/openai/chat/completions", () => {
    it("should handle non-streaming request", async () => {
      const requestBody = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Hello, how are you?",
          },
        ],
      };

      console.log(
        "Sending request body:",
        JSON.stringify(requestBody, null, 2)
      );

      const response = await fetch(`${baseUrl}/ai/openai/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", {
        "content-type": response.headers.get("content-type"),
        "content-length": response.headers.get("content-length"),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
      }

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("object");
      expect(result).toHaveProperty("created");
      expect(result).toHaveProperty("model");
      expect(result).toHaveProperty("choices");
      expect(result).toHaveProperty("usage");
      expect(Array.isArray(result.choices)).toBe(true);
      expect(result.choices.length).toBeGreaterThan(0);
      expect(result.choices[0]).toHaveProperty("message");
      expect(result.choices[0].message).toHaveProperty("content");
    });

    it("should handle streaming request", async () => {
      const response = await fetch(`${baseUrl}/ai/openai/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: "Hello, how are you?",
            },
          ],
          stream: true,
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      if (reader) {
        let chunks = 0;
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              expect(parsed).toHaveProperty("choices");
              chunks++;
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }

        expect(chunks).toBeGreaterThan(0);
      }
    });

    it("should handle function calls", async () => {
      const response = await fetch(`${baseUrl}/ai/openai/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: "What's the weather like in New York?",
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "get_weather",
                description: "Get the current weather in a given location",
                parameters: {
                  type: "object",
                  properties: {
                    location: {
                      type: "string",
                      description: "The city and state, e.g. San Francisco, CA",
                    },
                  },
                  required: ["location"],
                },
              },
            },
          ],
          tool_choice: "auto",
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result).toHaveProperty("choices");
      expect(result.choices.length).toBeGreaterThan(0);
    });

    it("should handle conversation with multiple messages", async () => {
      const response = await fetch(`${baseUrl}/ai/openai/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant.",
            },
            {
              role: "user",
              content: "Hello!",
            },
            {
              role: "assistant",
              content: "Hi there! How can I help you today?",
            },
            {
              role: "user",
              content: "What's 2+2?",
            },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result).toHaveProperty("choices");
      expect(result.choices.length).toBeGreaterThan(0);
      expect(result.choices[0].message).toHaveProperty("content");
    });

    it("should handle JSON response format", async () => {
      const response = await fetch(`${baseUrl}/ai/openai/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: "Give me a simple JSON object with name and age.",
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result).toHaveProperty("choices");
      expect(result.choices.length).toBeGreaterThan(0);
      expect(result.choices[0].message).toHaveProperty("content");

      // Try to parse the content as JSON
      const content = result.choices[0].message.content;
      if (content) {
        expect(() => JSON.parse(content)).not.toThrow();
      }
    });

    it("should return 400 for missing model", async () => {
      const response = await fetch(`${baseUrl}/ai/openai/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Hello",
            },
          ],
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing messages", async () => {
      const response = await fetch(`${baseUrl}/ai/openai/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 405 for non-POST requests", async () => {
      const response = await fetch(`${baseUrl}/ai/openai/chat/completions`, {
        method: "GET",
      });

      expect(response.status).toBe(405);
    });
  });
});
