"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type Message = { role: "assistant" | "user"; content: string; id: number };
const greeting: Message = { id: 1, role: "assistant", content: "Systems online. I'm Javis — your personal assistant. What can I take off your plate?" };
const MEMORY_KEY = "javis.memories.v1";

export default function Home() {
  const { data: session, status } = useSession();
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [memories, setMemories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const [chatError, setChatError] = useState("");
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  useEffect(() => {
    try { const saved = localStorage.getItem(MEMORY_KEY); if (saved) setMemories(JSON.parse(saved)); } catch { localStorage.removeItem(MEMORY_KEY); }
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, chatOpen]);
  useEffect(() => { try { localStorage.setItem(MEMORY_KEY, JSON.stringify(memories)); } catch { /* storage may be disabled */ } }, [memories]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setChatOpen(false); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setChatError("");
    const userMessage: Message = { id: nextId.current++, role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    const rememberMatch = text.match(/^remember(?: that)?\s+(.+)$/i);
    if (rememberMatch) {
      const fact = rememberMatch[1].trim().replace(/[.!?]+$/, "").slice(0, 300);
      if (fact) {
        const updated = [...memories.filter((item) => item.toLowerCase() !== fact.toLowerCase()), fact].slice(-30);
        setMemories(updated);
        setMessages((current) => [...current, { id: nextId.current++, role: "assistant", content: `Got it — I’ll remember “${fact}” on this browser. You can review or remove saved memories below.` }]);
      }
      return;
    }
    if (/^(forget|clear|delete) (all )?(my )?(memories|memory)$/i.test(text)) {
      setMemories([]);
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", content: "I cleared the memories saved in this browser." }]);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages.slice(-20).map(({ role, content }) => ({ role, content })), memories })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Chat request failed.");
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", content: result.reply }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Could not reach Javis.");
    } finally { setBusy(false); }
  }

  async function speak(message: Message) {
    if (speakingId !== null) return;
    setVoiceError(""); setSpeakingId(message.id);
    try {
      const response = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message.content }) });
      if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error ?? "Voice generation failed."); }
      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      audio.onended = () => { URL.revokeObjectURL(audioUrl); setSpeakingId(null); };
      audio.onerror = () => { URL.revokeObjectURL(audioUrl); setSpeakingId(null); setVoiceError("Audio playback failed."); };
      await audio.play();
    } catch (error) { setSpeakingId(null); setVoiceError(error instanceof Error ? error.message : "Could not reach voice service."); }
  }

  function dictate() {
    type SpeechResult = { [index: number]: { transcript: string } };
    type RecognitionEvent = { results: { [index: number]: SpeechResult } };
    type Recognition = { lang: string; interimResults: boolean; onresult: ((event: RecognitionEvent) => void) | null; onend: (() => void) | null; start: () => void };
    type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const RecognitionAPI = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!RecognitionAPI) { setVoiceError("Voice input isn't supported in this browser."); return; }
    setVoiceError("");
    const recognition = new RecognitionAPI(); recognition.lang = "en-US"; recognition.interimResults = false;
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    setListening(true); recognition.start();
  }

  return (
    <main className="app-shell">
      <aside className="rail">
        <a className="brand-mark" href="#home" aria-label="Javis home">J<span>.</span></a>
        <nav aria-label="Main navigation"><a className="rail-link selected" href="#home" aria-label="Dashboard" title="Dashboard">◈</a><button className="rail-link" onClick={() => setChatOpen(true)} aria-label="Open assistant chat" title="Assistant">⌘</button><a className="rail-link" href="#schedule" aria-label="Schedule" title="Schedule">▦</a></nav>
        <div className="rail-bottom"><span className="connection-dot" title="Systems online" /></div>
      </aside>
      <section className="main-area" id="home">
        <header className="topbar"><div className="wordmark"><span className="tiny-orbit">◉</span> JAVIS <span className="topbar-divider">/</span> PERSONAL SYSTEM</div>
          <div className="topbar-right"><span className="online-label"><i /> AI {process.env.NEXT_PUBLIC_APP_NAME ? "READY" : "ASSISTANT"}</span><span className="date-label">PERSONAL COMMAND CENTER</span>
            {status === "authenticated" ? <button className="connect-button connected" onClick={() => signOut()} title={`Disconnect ${session.user?.email ?? "Microsoft account"}`}>MS CONNECTED · DISCONNECT</button> : <button className="connect-button" onClick={() => signIn("azure-ad")} disabled={status === "loading"}>{status === "loading" ? "CHECKING..." : "CONNECT MICROSOFT"}</button>}
            <div className="user-chip">JB</div>
          </div>
        </header>
        <div className="workspace">
          <section className="intro-row"><div><p className="eyebrow">YOUR PERSONAL COMMAND CENTER</p><h1>Good morning, <span>Boss.</span></h1><p className="subheading">A clear view of today. Let’s make it count.</p></div><div className="day-count"><strong>J</strong><span>YOUR AI<br />ASSISTANT</span></div></section>
          <section className="control-grid" aria-label="Assistant dashboard">
            <article className="panel system-panel"><div className="panel-heading"><div><span className="section-index">01 / OVERVIEW</span><h2>Javis core</h2></div><span className="live-badge"><i /> LIVE</span></div>
              <div className="core-display"><div className="radar-grid" aria-hidden="true"><div className="radar-ring ring-one" /><div className="radar-ring ring-two" /><div className="radar-ring ring-three" /><div className="radar-cross cross-h" /><div className="radar-cross cross-v" /><div className="radar-sweep" /><div className="radar-core"><span>J</span><small>AI CORE</small></div><b className="radar-dot dot-one" /><b className="radar-dot dot-two" /><b className="radar-dot dot-three" /></div><div className="core-caption"><span>ASSISTANT STATUS</span><strong>Standing by<span className="blinking">_</span></strong></div></div>
              <div className="system-stats"><div><span>VOICE ENGINE</span><strong><i /> ELEVENLABS</strong></div><div><span>CONNECTION</span><strong><i /> SECURE</strong></div><div><span>MODE</span><strong>PERSONAL</strong></div></div>
            </article>
            <div className="side-stack"><article className="panel time-panel"><div className="panel-heading"><span className="section-index">02 / LOCAL TIME</span><span className="tiny-icon">◷</span></div><div className="time-readout">09<span>:</span>41<small>AM</small></div><div className="time-footer"><span>YOUR DAY IS UNDERWAY</span><span className="pulse-line" /></div></article>
              <article className="panel weather-panel"><div className="panel-heading"><span className="section-index">03 / CONDITIONS</span><span className="tiny-icon">⌁</span></div><div className="weather-content"><span className="weather-icon">☼</span><div><strong>72°</strong><span>Clear skies</span></div></div><div className="weather-footer"><span>WEATHER DEMO</span><span>LOCATION NOT SET</span></div></article>
              <article className="focus-panel"><div className="focus-icon">✳</div><div><span className="section-index">FOCUS MODE</span><strong>Make room for deep work.</strong></div><span className="focus-arrow">↗</span></article>
            </div>
          </section>
          <section className="agenda panel" id="schedule"><div className="panel-heading"><div><span className="section-index">04 / DAILY BRIEF</span><h2>On your radar</h2></div><span className="demo-tag">DEMO DATA</span></div><div className="agenda-row"><span className="agenda-time">10:30</span><span className="agenda-marker" /><div><strong>Make today yours</strong><span>Your schedule will appear here when you connect a calendar.</span></div><span className="agenda-kind">OPEN SLOT</span></div></section>
        </div>
      </section>
      {chatOpen && <><button className="chat-scrim" aria-label="Close chat" onClick={() => setChatOpen(false)} /><aside className="chat-dock" aria-label="Chat with Javis">
        <header className="chat-top"><div className="chat-avatar"><span>J</span><i /></div><div className="chat-title"><strong>Javis</strong><span>YOUR AI ASSISTANT</span></div><button className="more-button" onClick={() => setChatOpen(false)} aria-label="Minimize chat" title="Minimize">−</button></header>
        <div className="chat-context"><span className="context-spark">✳</span><div><strong>At your service.</strong><span>Ask me anything. Say “remember that…” to save a fact in this browser.</span></div></div>
        <div className="chat-transcript" aria-live="polite"><div className="day-divider"><span>TODAY</span></div>{messages.map((message) => <div key={message.id} className={`chat-message-row ${message.role}`}><div className={`chat-bubble ${message.role}`}>{message.content}</div>{message.role === "assistant" && <button className={`speak-button ${speakingId === message.id ? "is-speaking" : ""}`} onClick={() => speak(message)} aria-label="Play with ElevenLabs voice" title="Speak this message with ElevenLabs">{speakingId === message.id ? "◖))" : "◖"}</button>}</div>)}{busy && <div className="chat-bubble assistant typing">Javis is thinking…</div>}<div ref={endRef} /></div>
        <div className="chat-bottom">{chatError && <p className="chat-error" role="alert">{chatError}</p>}{voiceError && <p className="voice-error" role="status">{voiceError}</p>}
          {memories.length > 0 && <details className="memory-manager"><summary>SAVED MEMORY · {memories.length} <button type="button" className="clear-memory" onClick={(event) => { event.preventDefault(); setMemories([]); }}>CLEAR ALL</button></summary><ul>{memories.map((memory, index) => <li key={`${memory}-${index}`}><span>{memory}</span><button type="button" aria-label={`Forget ${memory}`} onClick={() => setMemories((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></li>)}</ul></details>}
          <form className="composer" onSubmit={sendMessage}><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message Javis..." aria-label="Message Javis" rows={2} /><div className="composer-actions"><button type="button" className={`mic-button ${listening ? "listening" : ""}`} onClick={dictate} aria-label="Dictate a message" title="Dictate">♩</button><span className="composer-hint">ENTER TO SEND</span><button type="submit" className="send-button" disabled={!input.trim() || busy} aria-label="Send message">↑</button></div></form>
          <div className="voice-note"><span>✦</span> ELEVENLABS VOICE READY <span className="voice-note-right">{memories.length} MEMORY ITEMS · THIS BROWSER</span></div>
        </div>
      </aside></>}
      {!chatOpen && <button className="chat-launcher" onClick={() => setChatOpen(true)} aria-label="Open Javis chat"><span className="launcher-orbit">J</span><span className="launcher-label">CHAT WITH JAVIS</span><span className="launcher-status" /></button>}
    </main>
  );
}
