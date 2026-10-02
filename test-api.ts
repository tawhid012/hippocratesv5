import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function test() {
  try {
    const start = Date.now();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hello",
    });
    console.log("Success in", Date.now() - start, "ms", response.text);
  } catch (e: any) {
    console.error("Failed:", e.message);
  }
}
test();
