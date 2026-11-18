# Javis AI

Javis is an advanced personal AI assistant designed to bring intelligent assistance, productivity and technology together in one powerful platform.

Featuring a futuristic sci-fi inspired command centre, Javis combines a sleek dark interface with electric-blue and cyan accents, a central interactive radar core, real-time system readouts and a dedicated AI chat dock.

Built to feel like a next-generation AI operating system, Javis provides users with a central place to interact with their assistant, access tools, manage tasks and control their digital workspace.

**Javis — Your Personal AI Command Centre.**
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
