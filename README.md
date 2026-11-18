# Javis

Javis is a sci-fi inspired personal assistant web app with a floating chat panel, OpenAI-powered replies, browser-local memory, and optional read-only Outlook/OneNote access through Microsoft Graph.

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill in the keys and Microsoft Entra app details described below
npm run dev
```

Open <http://localhost:3000>.

## AI setup

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (defaults to `gpt-4o-mini`). Chat requests go through the server route `/api/chat`; the API key is never sent to the browser. Conversations are sent to OpenAI to generate responses.

## Outlook and OneNote connection

Javis uses Microsoft sign-in and delegated Microsoft Graph permissions. Create an app registration in the Microsoft Entra admin center, add a **Web** redirect URI of `http://localhost:3000/api/auth/callback/azure-ad`, and provide its client ID, client secret, and tenant ID in `.env.local`. Set `NEXTAUTH_URL=http://localhost:3000` and generate a strong `NEXTAUTH_SECRET` (for example, `openssl rand -base64 32`). Add delegated Microsoft Graph permissions `User.Read`, `Mail.Read`, and `Notes.Read`, then grant consent as required by your tenant. For production, register your deployed callback URL and use HTTPS.

Click **Connect Microsoft** in the dashboard and sign in to consent. Javis only reads recent/search-matched Outlook mail and OneNote page content when asked. It does not send, edit, or delete mail or notes. Email and note excerpts selected by the assistant are sent to OpenAI to answer your request. Disconnect from the dashboard to end the local session; revoke the app's consent from your Microsoft account/tenant settings to remove its delegated access.

## Memory and privacy

Say `remember that ...` in chat to save an explicit fact. Memory is stored in this browser's local storage, included in chat requests for personalization, and can be individually removed or cleared from the chat panel. It is not encrypted or synced between devices; don't save passwords, secrets, or highly sensitive data. Use a private device and clear memory when sharing a browser profile.

## Voice

Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` to enable assistant speech playback. The key stays server-side. Browser dictation is available where supported.

Calendar and live weather integrations are not configured; those dashboard cards are demo content.
