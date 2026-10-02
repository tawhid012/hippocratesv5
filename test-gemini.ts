import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("No API key");

const ai = new GoogleGenAI({ apiKey });

async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "hello" }] }],
      config: {
        systemInstruction: "You are a test assistant.",
      },
    });
    console.log("Success:", res.text);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
