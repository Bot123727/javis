# Javis

Javis is a personal assistant web app with a sci-fi inspired command center and a dedicated chat dock. The interface is based on the visual reference: a dark HUD, cyan radar core, system readouts, and a compact assistant conversation panel.

## Run locally

```bash
npm install
cp .env.example .env.local
# Add your ElevenLabs API key and voice ID to .env.local
npm run dev
```

Open <http://localhost:3000>.

## Voice setup

Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `.env.local`. The key stays on the server; assistant message speech is generated through the `/api/speech` route when you press the speaker icon. A browser speech-recognition button is also available for dictation where supported.

## Current scope

The dashboard and chat interface are implemented with demo schedule, time, and weather content. Chat replies are placeholders until an AI chat provider is connected. Calendar and live weather integrations are not configured.
