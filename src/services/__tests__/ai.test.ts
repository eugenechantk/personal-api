import { beforeAll, describe, expect, test } from "bun:test";
import { AIService } from "../ai";

describe("AIService", () => {
  let aiService: AIService;
  const validBase64Image =
    "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVEiJtZZPbBtFFMZ/M7ubXdtdb1xSFyeilBapySVU8h8OoFaooFSqiihIVIpQBKci6KEg9Q6H9kovIHoCIVQJJCKE1ENFjnAgcaSGC6rEnxBwA04Tx43t2FnvDAfjkNibxgHxnWb2e/u992bee7tCa00YFsffekFY+nUzFtjW0LrvjRXrCDIAaPLlW0nHL0SsZtVoaF98mLrx3pdhOqLtYPHChahZcYYO7KvPFxvRl5XPp1sN3adWiD1ZAqD6XYK1b/dvE5IWryTt2udLFedwc1+9kLp+vbbpoDh+6TklxBeAi9TL0taeWpdmZzQDry0AcO+jQ12RyohqqoYoo8RDwJrU+qXkjWtfi8Xxt58BdQuwQs9qC/afLwCw8tnQbqYAPsgxE1S6F3EAIXux2oQFKm0ihMsOF71dHYx+f3NND68ghCu1YIoePPQN1pGRABkJ6Bus96CutRZMydTl+TvuiRW1m3n0eDl0vRPcEysqdXn+jsQPsrHMquGeXEaY4Yk4wxWcY5V/9scqOMOVUFthatyTy8QyqwZ+kDURKoMWxNKr2EeqVKcTNOajqKoBgOE28U4tdQl5p5bwCw7BWquaZSzAPlwjlithJtp3pTImSqQRrb2Z8PHGigD4RZuNX6JYj6wj7O4TFLbCO/Mn/m8R+h6rYSUb3ekokRY6f/YukArN979jcW+V/S8g0eT/N3VN3kTqWbQ428m9/8k0P/1aIhF36PccEl6EhOcAUCrXKZXXWS3XKd2vc/TRBG9O5ELC17MmWubD2nKhUKZa26Ba2+D3P+4/MNCFwg59oWVeYhkzgN/JDR8deKBoD7Y+ljEjGZ0sosXVTvbc6RHirr2reNy1OXd6pJsQ+gqjk8VWFYmHrwBzW/n+uMPFiRwHB2I7ih8ciHFxIkd/3Omk5tCDV1t+2nNu5sxxpDFNx+huNhVT3/zMDz8usXC3ddaHBj1GHj/As08fwTS7Kt1HBTmyN29vdwAw+/wbwLVOJ3uAD1wi/dUH7Qei66PfyuRj4Ik9is+hglfbkbfR3cnZm7chlUWLdwmprtCohX4HUtlOcQjLYCu+fzGJH2QRKvP3UNz8bWk1qMxjGTOMThZ3kvgLI5AzFfo379UAAAAASUVORK5CYII="; // example

  beforeAll(() => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for tests");
    }
    aiService = new AIService(apiKey);
  });

  test(
    "should generate text response for text-only prompt",
    async () => {
      const result = await aiService.generateResponse({
        prompt: "What is the capital of France?",
      });

      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("sources");
      expect(typeof result.text).toBe("string");
      expect(Array.isArray(result.sources)).toBe(true);
    },
    { timeout: 30000 }
  );

  test(
    "should generate response for prompt with image",
    async () => {
      const result = await aiService.generateResponse({
        prompt: "Describe this image",
        image: validBase64Image,
      });

      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("sources");
      expect(typeof result.text).toBe("string");
    },
    { timeout: 30000 }
  );

  test(
    "should handle invalid base64 image",
    async () => {
      await expect(
        aiService.generateResponse({
          prompt: "Describe this image",
          image: "invalid-base64",
        })
      ).rejects.toThrow();
    },
    { timeout: 30000 }
  );

  test(
    "should handle empty prompt",
    async () => {
      await expect(
        aiService.generateResponse({
          prompt: "",
        })
      ).rejects.toThrow();
    },
    { timeout: 30000 }
  );

  test(
    "should include search grounding sources",
    async () => {
      const result = await aiService.generateResponse({
        prompt: "What are the latest developments in AI?",
      });

      expect(result.sources!).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
      expect(result.sources!.length).toBeGreaterThan(0);
    },
    { timeout: 30000 }
  );
});
