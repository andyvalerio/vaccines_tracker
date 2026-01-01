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
  const today = new Date().toISOString().split('T')[0];

  try {
    let prompt = `Current Date: ${today}.\n`;
    prompt += `I received the ${vaccineName} vaccine`;
    if (dateTaken) {
       prompt += ` on ${dateTaken}.`;
    } else {
       prompt += `. I have not taken it yet, but I am planning to.`;
    }
    
    prompt += `
      Based on general medical guidelines for adults, when is the next dose typically due?
      
      Rules:
      1. If a next dose is needed, 'nextDueDate' MUST be in the future (after ${today}).
      2. If it is overdue, provide a date in the near future (e.g. 1 week from today).
      3. If no further doses are needed (e.g. fully vaccinated, lifetime immunity), set 'nextDueDate' to null.
      4. In 'notes', explain WHY. If null, explain that they are fully protected. If a date is set, explain why the booster is needed.
      
      Return JSON:
      {
        "nextDueDate": "YYYY-MM-DD" or null,
        "notes": "Short explanation (max 2 sentences)",
        "isRecommended": boolean
      }
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
    
    const result = JSON.parse(text);

    // Fallback safety check: If date is in past, move it to tomorrow
    if (result.nextDueDate && result.nextDueDate < today) {
       const d = new Date();
       d.setDate(d.getDate() + 1); // Set to tomorrow
       result.nextDueDate = d.toISOString().split('T')[0];
       result.notes += " (Date adjusted to near future as it appeared overdue).";
    }

    return result;

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