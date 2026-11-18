# Javis

Javis is a personal assistant web app with a HUD-style command center and persistent floating chat. It supports browser memory, optional read-only Outlook/OneNote access, ElevenLabs text-to-speech and voice input/wake-word support in compatible browsers.

## Run locally

```bash
npm install
cp .env.example .env.local
# Configure credentials needed for the integrations you plan to use
npm run dev
```

Open <http://localhost:3000>.

## Voice chat

Click the Javis radar's center icon or the **VOICE** button in the chat to grant microphone permission and start listening for **“Hey Javis.”** Say the wake phrase followed by your request, or say “Hey Javis” and then speak your request. Javis sends recognized speech to the configured AI and reads the response aloud through ElevenLabs. Wake-word detection uses browser speech recognition and keeps the microphone active until you switch it off; use **TURN OFF** or the mic button to stop it. Browser support varies (Chrome/Edge recommended), and microphone access requires HTTPS or localhost. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` for spoken replies; choose a voice in your ElevenLabs account and configure its voice ID. The app cannot create an ElevenLabs voice without your account credentials and any required voice sample/consent.

## Interactive chat

Open the bottom-right Javis launcher (or press **Ctrl/⌘ + J**). Start chats, browse/search/delete history, clear a chat, copy or edit a message, retry the latest answer, stop an in-flight request, and use suggested prompts. Press Enter to send and Shift+Enter for a new line. Chats and explicit memories are stored in this browser's local storage; they are not synced or encrypted.

## Optional connections

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` for AI replies. For Microsoft sign-in, register `http://localhost:3000/api/auth/callback/azure-ad` as an Entra Web redirect and configure Azure credentials, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`. Grant delegated `User.Read`, `Mail.Read`, and `Notes.Read` Graph permissions. Javis only reads Outlook mail and OneNote pages when asked; it does not send, edit, or delete them.
