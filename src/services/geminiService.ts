import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function translatePhilosophicalText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "";
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Translate the following scholarly or philosophical text into Chinese. 
      Requirements: 
      1. Use precise academic, psychological, or philosophical terminology appropriate for the context.
      2. Maintain the scholarly tone, elegance, and depth of the original text.
      3. Provide a brief explanation for extremely complex or culture-specific terms if necessary.
      4. Ensure the translation is fluent and natural in Chinese, avoiding awkward "translation-ese".
      5. Format with clear paragraphs.
      
      Text: ${text}`,
    });
    
    return response.text || "Translation failed.";
  } catch (error) {
    console.error("Translation error:", error);
    return "Error: Could not connect to the translation service.";
  }
}
