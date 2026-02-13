import { functions } from "../firebaseConfig";
import { httpsCallable } from "firebase/functions";
import { DietEntry } from "../types";

export const GeminiDietService = {
  getDietSuggestions: async (history: DietEntry[]): Promise<{ food: string[], symptoms: string[], medicines: string[] }> => {
    try {
      const suggestFn = httpsCallable<{ history: DietEntry[], userHour?: number }, { food: string[], symptoms: string[], medicines: string[] }>(
        functions,
        'suggestDiet'
      );

      const result = await suggestFn({
        history,
        userHour: new Date().getHours()
      });

      return result.data;
    } catch (error) {
      console.error("Cloud Function Diet Suggestion failed:", error);
      // Fallback defaults
      return {
        food: ["Oatmeal", "Salad", "Coffee", "Apple"],
        symptoms: ["Bloating", "Nausea", "Cramps"],
        medicines: ["Multivitamin", "Probiotic", "Ibuprofen"]
      };
    }
  }
};
