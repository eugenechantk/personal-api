import { beforeAll, describe, expect, test } from "bun:test";
import { AIService } from "../ai";

describe("AIService", () => {
  let aiService: AIService;
  const validBase64Image = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."; // truncated for brevity

  beforeAll(() => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for tests");
    }
    aiService = new AIService(apiKey);
  });

  test("should generate text response for text-only prompt", async () => {
    const result = await aiService.generateResponse({
      prompt: "What is the capital of France?",
    });

    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("sources");
    expect(typeof result.text).toBe("string");
    expect(Array.isArray(result.sources)).toBe(true);
  });

  test("should generate response for prompt with image", async () => {
    const result = await aiService.generateResponse({
      prompt: "Describe this image",
      image: validBase64Image,
    });

    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("sources");
    expect(typeof result.text).toBe("string");
  });

  test("should handle invalid base64 image", async () => {
    await expect(
      aiService.generateResponse({
        prompt: "Describe this image",
        image: "invalid-base64",
      })
    ).rejects.toThrow();
  });

  test("should handle empty prompt", async () => {
    await expect(
      aiService.generateResponse({
        prompt: "",
      })
    ).rejects.toThrow();
  });

  test("should include search grounding sources", async () => {
    const result = await aiService.generateResponse({
      prompt: "What are the latest developments in AI?",
    });

    expect(result.sources!).toBeDefined();
    expect(Array.isArray(result.sources)).toBe(true);
    expect(result.sources!.length).toBeGreaterThan(0);
  });
});
