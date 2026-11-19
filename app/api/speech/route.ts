import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    return NextResponse.json({ error: "Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env.local to enable voice." }, { status: 503 });
  }

  let text: unknown;
  try {
    ({ text } = await request.json());
  } catch {
    return NextResponse.json({ error: "Send a valid JSON body with a text field." }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim() || text.length > 2000) {
    return NextResponse.json({ error: "Text must contain 1–2000 characters." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: text.trim(), model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.48, similarity_boost: 0.75 } })
    });
    if (!response.ok) {
      console.error("ElevenLabs request failed:", response.status, await response.text());
      return NextResponse.json({ error: "ElevenLabs could not generate speech. Check your API key, voice ID, and account limits." }, { status: 502 });
    }
    return new NextResponse(await response.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ElevenLabs connection failed:", error);
    return NextResponse.json({ error: "Could not connect to ElevenLabs." }, { status: 502 });
  }
}
