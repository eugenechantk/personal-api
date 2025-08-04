import OpenAI from "openai";

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required");
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }
}
