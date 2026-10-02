import { NextResponse } from "next/server";

export async function GET() {
  const agentId =
    process.env.AEGIS_PRO_AGENT_ID?.trim() ||
    process.env.ELEVENLABS_AGENT_ID?.trim() ||
    "agent_8001m00as049frhtj6694xbqyhvs";

  return NextResponse.json({
    agentId,
  });
}
