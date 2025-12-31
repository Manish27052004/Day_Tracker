
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedScheduleItem {
    day: string;
    time: string;
    subject: string;
    type: 'Lecture' | 'Lab';
}

export interface ParsedSubject {
    name: string;
    professor?: string;
    color?: string; // AI can suggest a color
}

export interface TimetableResponse {
    subjects: ParsedSubject[];
    schedule: ParsedScheduleItem[];
}

export const parseTimetableImage = async (file: File, apiKey: string): Promise<TimetableResponse> => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Convert file to base64
    const base64Data = await fileToGenerativePart(file);

    const prompt = `
  Analyze this timetable image and extract the schedule into a strict JSON format.
  
  Details to extract:
  1. The Schedule: Day of week, Time range (e.g., "10:00-11:00"), Subject Name, and Type (Lecture or Lab).
  2. The Subjects: List of unique subjects found, and if there is a mapping at the bottom to "Faculty Name", include that professor's name.

  The JSON structure should be:
  {
    "subjects": [ { "name": "Subject Code/Name", "professor": "Name if found", "color": "Suggest a hex color" } ],
    "schedule": [ { "day": "Monday", "time": "10:00-11:00", "subject": "Subject Name", "type": "Lecture" } ]
  }
  
  Notes:
  - If a slot says "BREAK", ignore it.
  - If a slot spans multiple columns (like a Lab), represent it as a single entry with the full time range (e.g., 14:00-17:00).
  - Normalize days to "Monday", "Tuesday", etc.
  - Be precise with "AM/PM" if visible, otherwise assume standard college hours (start ~9AM).
  - Return ONLY the JSON string, no markdown code blocks.
  `;

    try {
        const result = await model.generateContent([prompt, base64Data]);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown code blocks
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanedText) as TimetableResponse;
    } catch (error: any) {
        console.error("Gemini API Error Full Object:", error);
        const msg = error?.message || String(error);
        throw new Error(`Gemini AI Failed: ${msg}`);
    }
};

async function fileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: await base64EncodedDataPromise as string,
            mimeType: file.type,
        },
    };
}
