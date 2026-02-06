
import { GoogleGenAI, Type } from "@google/genai";
import { DietEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const GeminiDietService = {
  getDietSuggestions: async (history: DietEntry[]): Promise<{ food: string[], symptoms: string[] }> => {
    const hour = new Date().getHours();
    const recentLogs = history.slice(0, 15).map(h => ({
      type: h.type,
      name: h.name,
      time: new Date(h.timestamp).getHours()
    }));

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Current hour: ${hour} (0-23). User History: ${JSON.stringify(recentLogs)}.
        
        Based on the current time and user history, suggest:
        1. 4-5 Food items they are likely to eat now.
        2. 3-4 GI symptoms they might be feeling based on what they recently ate.
        
        Guidelines:
        - If the user often eats "Eggs" in the morning and it's morning, suggest "Eggs".
        - If they ate something heavy or spicy recently, suggest relevant symptoms like "Bloating" or "Heartburn".
        - Keep names short (1-2 words).
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              food: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              symptoms: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["food", "symptoms"]
          }
        }
      });

      const text = response.text;
      if (!text) return { food: [], symptoms: [] };
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Diet Suggestion failed:", error);
      // Fallback defaults
      return {
        food: ["Oatmeal", "Salad", "Coffee", "Apple"],
        symptoms: ["Bloating", "Nausea", "Cramps"]
      };
    }
  }
};
