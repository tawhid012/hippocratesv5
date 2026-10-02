import { getActiveGeminiApiKey } from "./src/lib/gemini/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkKey() {
  try {
    const key = await getActiveGeminiApiKey();
    console.log("ACTIVE KEY:", key.substring(0, 10) + "..." + key.slice(-4));
  } catch (err) {
    console.error("ERROR:", err);
  }
}

checkKey();
