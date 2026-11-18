# Javis

Javis is a personal assistant web app with a HUD-style command center, floating chat, browser-local memory, and optional Microsoft Outlook/OneNote and ElevenLabs connections.

## Run locally

```bash
npm install
cp .env.example .env.local
# Configure the values you need in .env.local
npm run dev
```

Open <http://localhost:3000>.

## Welcome and logo

On launch, Javis shows the supplied Javis logo as an animated splash, followed by a text greeting in the chat. The logo recreation is in `public/javis-logo.svg`. Turn **SOUND ON** to hear ElevenLabs' greeting. Browsers generally block audio on page load until you interact; enabling sound is the required user gesture, and if playback is blocked, click **Play greeting** in the chat.

## AI and speech

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `gpt-4o-mini`) for AI chat. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` for speech. Secrets stay server-side.

## Outlook and OneNote

Configure Microsoft Entra credentials in `.env.local`, register `http://localhost:3000/api/auth/callback/azure-ad` as a Web redirect URI, and grant delegated `User.Read`, `Mail.Read`, and `Notes.Read` permissions. Select **Connect Microsoft** to sign in and consent. Javis only reads mail and notes when asked; it does not send, edit, or delete them. Relevant excerpts are sent to the configured AI provider to answer the request.

## Memory and privacy

Say `remember that ...` to save a fact in this browser's local storage. Memories can be reviewed and cleared in chat. They are not encrypted or synced, so don't store passwords or sensitive information. Clear them on shared devices.
