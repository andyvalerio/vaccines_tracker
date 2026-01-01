import { functions } from "../firebaseConfig";
import { httpsCallable } from "firebase/functions";
import { AiSuggestion, Suggestion, Vaccine } from "../types";

export const GeminiService = {
  analyzeVaccine: async (vaccineName: string, dateTaken?: string): Promise<AiSuggestion> => {
    try {
      const analyzeVaccineFn = httpsCallable<{ vaccineName: string, dateTaken?: string }, AiSuggestion>(
        functions, 
        'analyzeVaccine'
      );
      
      const result = await analyzeVaccineFn({ vaccineName, dateTaken });
      return result.data;
    } catch (error) {
      console.error("Cloud Function analysis failed:", error);
      return {
        nextDueDate: null,
        notes: "Could not fetch automatic advice. Please consult a doctor.",
        isRecommended: true
      };
    }
  },

  suggestMissingVaccines: async (currentVaccines: Vaccine[], dismissedNames: string[]): Promise<Suggestion[]> => {
    try {
      // We only send minimal data needed for the suggestion
      const payload = {
        currentVaccines: currentVaccines.map(v => ({ name: v.name })),
        dismissedNames
      };

      const suggestFn = httpsCallable<typeof payload, Suggestion[]>(
        functions, 
        'suggestMissingVaccines'
      );

      const result = await suggestFn(payload);
      return result.data;
    } catch (error) {
      console.error("Cloud Function suggestion failed", error);
      return [];
    }
  }
};