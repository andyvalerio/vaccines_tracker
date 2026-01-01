import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI, Type } from "@google/genai";

// Define the secret parameter (Must set via `firebase functions:secrets:set GEMINI_API_KEY`)
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Initialize in the function scope to ensure secret is available
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: geminiApiKey.value() });
};

export const analyzeVaccine = onCall({ secrets: [geminiApiKey], region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The user must be authenticated.');
  }

  const { vaccineName, dateTaken } = request.data;
  const ai = getAiClient();

  try {
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
      
      Return the response in JSON format with keys: 'nextDueDate' (YYYY-MM-DD or null), 'notes' (string), 'isRecommended' (boolean).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Backend AI Error:", error);
    throw new HttpsError('internal', 'Failed to analyze vaccine data');
  }
});

export const suggestMissingVaccines = onCall({ secrets: [geminiApiKey], region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The user must be authenticated.');
  }

  const { currentVaccines, dismissedNames } = request.data;
  const ai = getAiClient();

  try {
    const currentNames = currentVaccines.map((v: any) => v.name).join(", ");
    const dismissed = dismissedNames.join(", ");
    
    const prompt = `
      User has these vaccines: [${currentNames}].
      User has explicitly dismissed/ignored these suggestions: [${dismissed}].
      
      Identify 2 or 3 important vaccines for a general adult that are missing from the list.
      Do NOT suggest vaccines that are already in the "User has" list or the "dismissed" list.
      Focus on common ones like Tetanus, Flu, HPV, Hepatitis, COVID-19, etc.
      
      Return a JSON array of objects. Each object must have:
      - "name": Standard name of the vaccine.
      - "reason": Very short reason (max 10 words) why it might be needed.
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
    // Add IDs on server side
    return raw.map((item: any, index: number) => ({
      id: `sugg_${Date.now()}_${index}`,
      name: item.name,
      reason: item.reason
    }));

  } catch (error) {
    console.error("Backend AI Error:", error);
    throw new HttpsError('internal', 'Failed to generate suggestions');
  }
});