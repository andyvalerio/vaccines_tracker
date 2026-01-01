import { GoogleGenAI, Type } from "@google/genai";
import { AiSuggestion, Suggestion, Vaccine } from "../types";

const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  analyzeVaccine: async (vaccineName: string, dateTaken?: string): Promise<AiSuggestion> => {
    if (!apiKey) {
      console.warn("No API Key available for Gemini.");
      return { nextDueDate: null, notes: "AI features unavailable without API Key.", isRecommended: false };
    }

    try {
      const model = "gemini-3-flash-preview";
      
      let prompt = `I received the ${vaccineName} vaccine`;
      if (dateTaken) {
         prompt += ` on ${dateTaken}.`;
      } else {
         prompt += `. I have not taken it yet, but I am planning to.`;
      }
      
      prompt += `
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
  },

  suggestMissingVaccines: async (currentVaccines: Vaccine[], dismissedNames: string[]): Promise<Suggestion[]> => {
    if (!apiKey) return [];

    try {
      const currentNames = currentVaccines.map(v => v.name).join(", ");
      const dismissed = dismissedNames.join(", ");
      
      const prompt = `
        User has these vaccines: [${currentNames}].
        User has explicitly dismissed/ignored these suggestions: [${dismissed}].
        
        Identify 2 or 3 important vaccines for a general adult that are missing from the list.
        Do NOT suggest vaccines that are already in the "User has" list or the "dismissed" list.
        Focus on common ones like Tetanus, Flu, HPV, Hepatitis, COVID-19, etc.
        
        Return a JSON array of objects. Each object must have:
        - "name": Standard name of the vaccine.
        - "reason": Very short reason (max 10 words) why it might be needed (e.g. "Booster every 10 years").
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["name", "reason"],
            }
          },
        },
      });

      const text = response.text;
      if (!text) return [];

      const raw = JSON.parse(text);
      // Map to include IDs
      return raw.map((item: any, index: number) => ({
        id: `sugg_${Date.now()}_${index}`,
        name: item.name,
        reason: item.reason
      }));

    } catch (error) {
      console.error("Gemini suggestion failed", error);
      return [];
    }
  }
};