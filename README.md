# Javis

Javis is a personal assistant web app with a HUD-style command center and floating chat. Chat history is saved in this browser; the assistant can use OpenAI, optional read-only Outlook/OneNote access, and ElevenLabs speech when configured.

## Run locally

```bash
npm install
cp .env.example .env.local
# Configure credentials needed for the integrations you plan to use
npm run dev
```

Open <http://localhost:3000>.

## Interactive chat

Open the bottom-right Javis launcher (or press **Ctrl/⌘ + J**). Start chats, browse/search/delete conversation history, clear a chat, copy or edit a message, retry the latest answer, stop an in-flight request, and use suggested prompts. Press Enter to send and Shift+Enter for a new line. Chats persist in this browser's local storage; they are not synced across devices. The API key is server-side; set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` for AI replies.

Say `remember that ...` to save a fact in browser memory, or `clear my memory` to remove it. Memories are stored locally and are not encrypted; do not save sensitive information.

## Optional connections

For ElevenLabs, set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`. For Microsoft sign-in, register `http://localhost:3000/api/auth/callback/azure-ad` as an Entra Web redirect and configure the Azure credentials, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`. Grant the delegated `User.Read`, `Mail.Read`, and `Notes.Read` Graph permissions. Javis only reads Outlook mail and OneNote pages when asked; it does not send, edit, or delete them.
