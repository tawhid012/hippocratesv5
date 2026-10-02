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

async function list() {
  try {
    const res = await ai.models.list(); // Or whatever the method is for listing
    for await (const m of res) {
      console.log(m.name);
    }
  } catch (e: any) {
    console.log("Failed to list models:", e.message);
  }
}
list();
