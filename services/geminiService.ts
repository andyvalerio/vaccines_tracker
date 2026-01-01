import { GoogleGenAI, Type } from "@google/genai";
import { AiSuggestion } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize Gemini
// Note: In a real production app, you might proxy this through your backend
// to keep the key secure, or use Firebase Functions.
const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  analyzeVaccine: async (vaccineName: string, dateTaken: string): Promise<AiSuggestion> => {
    if (!apiKey) {
      console.warn("No API Key available for Gemini.");
      return { nextDueDate: null, notes: "AI features unavailable without API Key.", isRecommended: false };
    }

    try {
      const model = "gemini-3-flash-preview";
      const prompt = `
        I received the ${vaccineName} vaccine on ${dateTaken}.
        Based on general medical guidelines for adults, when is the next dose typically due?
        If it's a one-time vaccine, indicate that.
        Provide a very brief note (max 2 sentences) about what this vaccine protects against.
        
        Return the response in JSON format with keys: 'nextDueDate' (YYYY-MM-DD or null), 'notes' (string), 'isRecommended' (boolean - usually true unless it's a deprecated vaccine).
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nextDueDate: { type: Type.STRING, nullable: true },
              notes: { type: Type.STRING },
              isRecommended: { type: Type.BOOLEAN },
            },
            required: ["notes", "isRecommended"],
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      return JSON.parse(text) as AiSuggestion;
    } catch (error) {
      console.error("Gemini analysis failed:", error);
      return {
        nextDueDate: null,
        notes: "Could not fetch automatic advice. Please consult a doctor.",
        isRecommended: true
      };
    }
  }
};