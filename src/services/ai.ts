import { google } from "@ai-sdk/google";
import {
  generateText,
  type DataContent,
  type ImagePart,
  type TextPart,
} from "ai";

export class AIService {
  private model: any;

  constructor(apiKey: string) {
    this.model = google("gemini-2.5-flash-preview-04-17", {
      useSearchGrounding: true,
    });
  }

  async generateResponse(params: {
    prompt: string;
    image?: DataContent; // base64 encoded image
  }): Promise<{
    text: string;
    sources?: any[];
  }> {
    const { prompt, image } = params;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const result = await generateText({
      model: google("gemini-1.5-flash"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt } as TextPart,
            ...(image ? [{ type: "image", image } as ImagePart] : []),
          ],
        },
      ],
    });
    const { text, sources } = result;

    return { text, sources };
  }
}
