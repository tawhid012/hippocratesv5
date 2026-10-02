import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  const agentId =
    process.env.AEGIS_PRO_AGENT_ID?.trim() ||
    process.env.ELEVENLABS_AGENT_ID?.trim() ||
    "agent_8001m00as049frhtj6694xbqyhvs";

  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key is missing. Please configure ELEVENLABS_API_KEY." },
      { status: 500 }
    );
  }

  if (!agentId) {
    return NextResponse.json(
      { error: "Aegis Pro Agent ID is missing. Please configure AEGIS_PRO_AGENT_ID." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(
        agentId
      )}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn("Signed URL generation unavailable (falling back to agentId direct connection):", response.status, errorText);
      
      // If the API key does not have convai_write permissions or signed URLs are not supported,
      // return the agent ID so the client SDK connects directly.
      return NextResponse.json({
        agentId,
        fallbackMode: true,
      });
    }

    const data = (await response.json().catch(() => ({}))) as { signed_url?: string };

    if (!data.signed_url) {
      return NextResponse.json({
        agentId,
        fallbackMode: true,
      });
    }

    return NextResponse.json({
      signedUrl: data.signed_url,
      agentId,
    });
  } catch (err) {
    console.warn("Signed URL fetch failed, falling back to agentId:", err);
    return NextResponse.json({
      agentId,
      fallbackMode: true,
    });
  }
}
