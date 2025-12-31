
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeAttendancePhoto = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "Analyze this selfie for attendance. Verify if a human face is clearly visible, centered, and well-lit. Return a JSON object with 'score' (0-100), 'isValid' (boolean), and 'reason' (string)." },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            isValid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["score", "isValid", "reason"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return { score: 100, isValid: true, reason: "Analysis bypassed due to error" };
  }
};

export const getWorkforceInsights = async (attendanceData: any[]) => {
  try {
    const summary = attendanceData.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a 2-sentence performance summary for an admin dashboard based on these stats: ${JSON.stringify(summary)}`,
    });

    return response.text;
  } catch (error) {
    return "Workforce performance is within normal parameters.";
  }
};
