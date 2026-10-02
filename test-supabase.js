require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("No Supabase URL/Key found");
  process.exit(1);
}

const supabase = createClient(url, key);
async function test() {
  console.log("Testing Supabase Insert...");
  const id = crypto.randomUUID();
  const { error } = await supabase.from("chat_sessions").upsert({
    id,
    title: "Test Session",
    workspace_type: "aegis",
    model: "aegis-core",
    persona: "patient",
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  console.log("Insert Error:", error);
  
  if (!error) {
    console.log("Testing Supabase Delete...");
    const { error: delError } = await supabase.from("chat_sessions").delete().eq("id", id);
    console.log("Delete Error:", delError);
  }
}
test();
