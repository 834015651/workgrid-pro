import { GoogleGenAI, Type } from "@google/genai";
import { ImportedFile, AnalysisType } from "../types";

// Initialize Gemini
// NOTE: In a real app, ensure process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-2.5-flash';

export const analyzeContent = async (
  file: ImportedFile,
  analysisType: AnalysisType,
  customPrompt?: string
): Promise<{ text: string; json?: any }> => {
  
  let prompt = "";
  let schema = undefined;
  let responseMimeType = "text/plain";

  switch (analysisType) {
    case AnalysisType.SUMMARY:
      prompt = "Please provide a concise and professional summary of the following content. Highlight key points, dates, and actionable items.";
      break;
    case AnalysisType.CLEANUP:
      prompt = "Please proofread, correct formatting errors, and improve the clarity of the following text while maintaining the original meaning. Return the cleaned text.";
      break;
    case AnalysisType.EXTRACTION:
      prompt = "Extract key entities and structured data from the following content. Return the result as a structured JSON object containing fields like 'entities', 'dates', 'summary', and 'sentiment'.";
      responseMimeType = "application/json";
      // We could use responseSchema here for strict typing, but open JSON is often more flexible for generic imports.
      // Let's use a generic schema to ensure JSON structure if possible, or just MIME type.
      // For generic extraction, relying on MIME type is often safer unless we know the exact fields.
      break;
    case AnalysisType.CUSTOM:
      prompt = customPrompt || "Analyze this content.";
      break;
  }

  const parts: any[] = [];

  if (file.type === 'IMAGE') {
    // Expecting file.content to be a base64 string without the data prefix for the API?
    // Usually the file input reader includes "data:image/png;base64,...".
    // We need to strip that for the API if we pass it as raw base64, or handle it carefully.
    const base64Data = file.content.split(',')[1] || file.content;
    
    parts.push({
      inlineData: {
        mimeType: file.mimeType || 'image/jpeg',
        data: base64Data
      }
    });
    parts.push({ text: prompt });
  } else {
    parts.push({ text: `${prompt}\n\n---\n\n${file.content}` });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: responseMimeType,
        // Only set thinking budget for Pro models usually, Flash is fast enough without complex thinking
      }
    });

    const text = response.text || "No response generated.";
    let json = undefined;

    if (analysisType === AnalysisType.EXTRACTION || responseMimeType === "application/json") {
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.warn("Failed to parse JSON response", e);
      }
    }

    return { text, json };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze content. Please check your API key and try again.");
  }
};