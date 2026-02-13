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

  const { vaccineName, dateTaken, history } = request.data;
  const ai = getAiClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    let prompt = `Current Date: ${today}.\n`;
    prompt += `I received the ${vaccineName} vaccine`;

    if (dateTaken) {
      prompt += ` on ${dateTaken} (latest dose).`;
    } else {
      prompt += `. I have not taken the latest dose yet.`;
    }

    if (history && Array.isArray(history) && history.length > 0) {
      prompt += ` Prior to that, I took doses on: [${history.join(', ')}].`;
    }

    prompt += `
      Based on general medical guidelines for adults, when is the next dose typically due?
      
      Rules:
      1. Consider the history. If this was a multi-dose series (like Hepatitis B or HPV) and I have completed the series based on the dates provided, set 'nextDueDate' to null and explain I am fully vaccinated.
      2. If it is a recurring vaccine (like Flu or Tetanus), calculate the next date based on the *latest* dose.
      3. 'nextDueDate' MUST be in the future (after ${today}).
      4. If it appears overdue, provide a date in the near future (e.g. 1 week from today).
      5. In 'notes', explain the logic (e.g. "Annual booster", "Shot 3 of 3 completed").
      
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

export const suggestDiet = onCall({ secrets: [geminiApiKey], region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The user must be authenticated.');
  }

  const { history, userHour } = request.data;
  const ai = getAiClient();
  const hour = userHour !== undefined ? userHour : new Date().getHours();

  try {
    const recentLogs = history.slice(0, 20).map((h: any) => ({
      type: h.type,
      name: h.name,
      time: new Date(h.timestamp).getHours()
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Current hour: ${hour} (0-23). User History: ${JSON.stringify(recentLogs)}.
      
      Based on the current time and user history, suggest:
      1. 4-5 Food items they are likely to eat now.
      2. 3-4 GI symptoms they might be feeling based on what they recently ate.
      3. 3-4 Medicines or supplements they might take (e.g. Vitamins in morning, Antacids after heavy meals, Melatonin at night).
      
      Guidelines:
      - If the user often eats "Eggs" in the morning and it's morning, suggest "Eggs".
      - If they ate something heavy or spicy recently, suggest relevant symptoms like "Bloating" or medicines like "Antacid".
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
            },
            medicines: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["food", "symptoms", "medicines"]
        }
      }
    });

    const text = response.text;
    if (!text) return { food: [], symptoms: [], medicines: [] };
    return JSON.parse(text);

  } catch (error) {
    console.error("Backend Diet AI Error:", error);
    // Return empty defaults rather than throwing, to gracefully handle errors in UI
    return {
      food: ["Oatmeal", "Salad", "Coffee", "Apple"],
      symptoms: ["Bloating", "Nausea", "Cramps"],
      medicines: ["Multivitamin", "Probiotic", "Ibuprofen"]
    };
  }
});