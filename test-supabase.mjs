import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", url ? "Set" : "Not Set");
console.log("Key:", key ? "Set" : "Not Set");

if (url && key) {
  const supabase = createClient(url, key);
  const id = crypto.randomUUID();
  const { error } = await supabase.from("chat_sessions").upsert({
    id,
    title: "Test",
    workspace_type: "aegis",
    last_message_at: new Date().toISOString()
  });
  console.log("Insert:", error || "Success");
  if (!error) {
    const { error: delErr } = await supabase.from("chat_sessions").delete().eq("id", id);
    console.log("Delete:", delErr || "Success");
  }
}
