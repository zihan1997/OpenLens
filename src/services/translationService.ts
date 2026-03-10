import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export type AIProvider = 'gemini' | 'ollama-cloud';

export interface TranslationOptions {
  provider: AIProvider;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  useProxy?: boolean;
}

const geminiAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_PROMPT = `Translate the following scholarly or philosophical text into Chinese. 
Requirements: 
1. Use precise academic, psychological, or philosophical terminology appropriate for the context.
2. Maintain the scholarly tone, elegance, and depth of the original text.
3. Provide a brief explanation for extremely complex or culture-specific terms if necessary.
4. Ensure the translation is fluent and natural in Chinese, avoiding awkward "translation-ese".
5. Format with clear paragraphs.`;

async function translateWithGemini(text: string, model: string = "gemini-3.1-pro-preview"): Promise<string> {
  try {
    const response: GenerateContentResponse = await geminiAi.models.generateContent({
      model: model,
      contents: `${SYSTEM_PROMPT}\n\nText: ${text}`,
    });
    return response.text || "Translation failed.";
  } catch (error) {
    console.error("Gemini translation error:", error);
    throw error;
  }
}

async function translateWithOllamaCloud(text: string, options: TranslationOptions): Promise<string> {
  try {
    const response = await fetch('/api/translate/ollama-cloud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model: options.model || "minimax",
        systemPrompt: SYSTEM_PROMPT,
        host: options.baseUrl || "https://ollama.com"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Ollama Cloud error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.content || "Translation failed.";
  } catch (error) {
    console.error("Ollama Cloud translation error:", error);
    throw error;
  }
}

export async function checkProviderStatus(options: TranslationOptions): Promise<{ success: boolean; message: string }> {
  if (options.provider === 'gemini') {
    try {
      if (!process.env.GEMINI_API_KEY) return { success: false, message: "Gemini API Key missing." };
      return { success: true, message: "Gemini service is ready." };
    } catch (e) {
      return { success: false, message: "Gemini connection failed." };
    }
  } else if (options.provider === 'ollama-cloud') {
    try {
      // Simple check for cloud - just verify the endpoint exists
      const response = await fetch('/api/proxy/health?url=' + encodeURIComponent(options.baseUrl || 'https://ollama.com'));
      if (response.ok) return { success: true, message: "Ollama Cloud gateway is reachable." };
      return { success: false, message: "Ollama Cloud gateway unreachable." };
    } catch (e) {
      return { success: false, message: "Ollama Cloud connection failed." };
    }
  }
  return { success: false, message: "Unknown provider." };
}

export async function translatePhilosophicalText(text: string, options: TranslationOptions): Promise<string> {
  if (!text || text.trim().length === 0) return "";
  
  try {
    if (options.provider === 'gemini') {
      return await translateWithGemini(text, options.model);
    } else if (options.provider === 'ollama-cloud') {
      return await translateWithOllamaCloud(text, options);
    }
    return "Error: Unknown provider.";
  } catch (error: any) {
    return `Error: ${error.message || "Could not connect to the translation service."}`;
  }
}
