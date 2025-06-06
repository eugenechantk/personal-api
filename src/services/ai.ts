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
      dynamicRetrievalConfig: {
        mode: "MODE_UNSPECIFIED",
      },
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

    console.log(`Sending to AI: ${prompt}${image ? " (with image)" : ""}`);

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const result = await generateText({
      model: this.model,
      system: `
      You will mostly be answering questions. 
      1. Keep your answers concise and precise. Preferrably in 1-2 sentences. When necessary, use bullet points.
      2. You will be given a prompt and sometimes an image. Use the image to help you answer the question if it is provided.
      3. the output should be in plain text. So don't use any markdown.
      `,
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

    // console.log(result);

    return { text, sources };
  }
}
