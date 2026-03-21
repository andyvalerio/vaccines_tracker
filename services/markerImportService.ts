import { functions } from "../firebaseConfig";
import { httpsCallable } from "firebase/functions";

export interface ParsedBloodMarker {
    name: string;
    value: number;
    date: string;
    unit?: string;
    rangeMin?: number;
    rangeMax?: number;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            let result = reader.result as string;
            // remove the Data-URI header for gemini (e.g. "data:application/pdf;base64,")
            const base64Index = result.indexOf(',') + 1;
            resolve(result.substring(base64Index));
        };
        reader.onerror = error => reject(error);
    });
};

export const MarkerImportService = {
    processFile: async (file: File): Promise<ParsedBloodMarker[]> => {
        if (localStorage.getItem('E2E_TEST_MODE')) {
            return [
                { name: "LDL Cholesterol", value: 4.1, date: "2025-10-15", unit: "mmol/L", rangeMin: 3.0, rangeMax: 5.0 },
                { name: "Vitamin D", value: 25, date: "2025-10-15", unit: "ng/mL", rangeMin: 30, rangeMax: 100 }
            ];
        }

        try {
            const parseBloodMarkersFn = httpsCallable<any, ParsedBloodMarker[]>(
                functions,
                'parseBloodMarkers'
            );

            const base64 = await fileToBase64(file);

            const payload = {
                fileData: {
                    base64: base64,
                    mimeType: file.type || "application/pdf"
                }
            };

            const result = await parseBloodMarkersFn(payload);
            console.log(">>> Gemini AI Raw Backend Response:", result.data);
            return result.data || [];
        } catch (error) {
            console.error("Cloud Function marker parsing failed:", error);
            throw new Error("Failed to parse file for markers");
        }
    }
};
