"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type Message = { role: "assistant" | "user"; content: string; id: number };
const GREETING = "Good to see you. I'm Javis, your personal AI assistant. What would you like to get done today?";
const MEMORY_KEY = "javis.memories.v1";
const VOICE_KEY = "javis.voice-greeting.v1";

export default function Home() {
  const { data: session, status } = useSession();
  const [booting, setBooting] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", content: GREETING }]);
  const [memories, setMemories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoGreetingAttempted = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 1700);
    try {
      const saved = localStorage.getItem(MEMORY_KEY);
      if (saved) setMemories(JSON.parse(saved) as string[]);
      setVoiceEnabled(localStorage.getItem(VOICE_KEY) === "on");
    } catch { /* Local storage may be disabled by browser settings. */ }
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { try { localStorage.setItem(MEMORY_KEY, JSON.stringify(memories)); } catch { /* Storage is optional. */ } }, [memories]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatOpen, busy]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setChatOpen(false); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const speakText = useCallback(async (text: string) => {
    setVoiceError("");
    setSpeaking(true);
    try {
      const response = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? "Voice generation failed.");
      }
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
      }
      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(audioUrl); setSpeaking(false); };
      audio.onerror = () => { URL.revokeObjectURL(audioUrl); setSpeaking(false); setVoiceError("Audio playback failed. Tap the speaker to try again."); };
      await audio.play();
    } catch (error) {
      setSpeaking(false);
      const message = error instanceof Error ? error.message : "Could not reach voice service.";
      setVoiceError(message.toLowerCase().includes("play") ? "Your browser blocked automatic audio. Tap Play greeting to hear Javis." : message);
    }
  }, []);

  useEffect(() => {
    if (!booting && voiceEnabled && !autoGreetingAttempted.current) {
      autoGreetingAttempted.current = true;
      void speakText(GREETING);
    }
  }, [booting, voiceEnabled, speakText]);

  function toggleVoice() {
    const enabled = !voiceEnabled;
    setVoiceEnabled(enabled);
    try { localStorage.setItem(VOICE_KEY, enabled ? "on" : "off"); } catch { /* Storage is optional. */ }
    if (enabled) {
      autoGreetingAttempted.current = true;
      void speakText(GREETING);
    } else {
      audioRef.current?.pause();
      setSpeaking(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setChatError("");
    const thread = [...messages, { id: nextId.current++, role: "user" as const, content: text }];
    setMessages(thread);

    const rememberMatch = text.match(/^remember(?: that)?\s+(.+)$/i);
    if (rememberMatch) {
      const fact = rememberMatch[1].trim().replace(/[.!?]+$/, "").slice(0, 300);
      if (fact) {
        setMemories((current) => [...current.filter((item) => item.toLowerCase() !== fact.toLowerCase()), fact].slice(-30));
        setMessages((current) => [...current, { id: nextId.current++, role: "assistant", content: `Got it — I’ll remember “${fact}” in this browser. You can review or remove saved memories here.` }]);
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
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: thread.slice(-20).map(({ role, content }) => ({ role, content })), memories }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Chat request failed.");
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", content: result.reply }]);
    } catch (error) { setChatError(error instanceof Error ? error.message : "Could not reach Javis."); }
    finally { setBusy(false); }
  }

  return (
    <main className="app-shell" id="home">
      {booting && <div className="boot-screen" role="status" aria-label="Starting Javis"><img src="/javis-logo.svg" alt="Javis" /><p>PERSONAL ASSISTANT <span>·</span> SYSTEM ONLINE</p><div className="boot-progress"><i /></div><button onClick={() => setBooting(false)}>ENTER JAVIS <span>↗</span></button></div>}
      <aside className="rail"><a className="brand-mark" href="#home" aria-label="Javis home"><img src="/javis-logo.svg" alt="Javis" /></a><nav aria-label="Main navigation"><a className="rail-link selected" href="#home" aria-label="Dashboard">◈</a><button className="rail-link" onClick={() => setChatOpen(true)} aria-label="Open assistant chat">⌘</button><a className="rail-link" href="#schedule" aria-label="Schedule">▦</a></nav><span className="connection-dot" title="System online" /></aside>
      <section className="main-area">
        <header className="topbar"><div className="wordmark"><img src="/javis-logo.svg" alt="" /><span>PERSONAL SYSTEM</span></div><div className="topbar-right"><span className="online-label"><i /> SYSTEM ONLINE</span><button className={`voice-toggle ${voiceEnabled ? "is-enabled" : ""}`} onClick={toggleVoice} aria-pressed={voiceEnabled}>{voiceEnabled ? "◖ SOUND ON" : "◖ SOUND OFF"}</button>{status === "authenticated" ? <button className="connect-button connected" onClick={() => signOut()} title={`Disconnect ${session.user?.email ?? "Microsoft account"}`}>MS CONNECTED · DISCONNECT</button> : <button className="connect-button" onClick={() => signIn("azure-ad")} disabled={status === "loading"}>{status === "loading" ? "CHECKING..." : "CONNECT MICROSOFT"}</button>}</div></header>
        <div className="workspace"><section className="intro-row"><div><p className="eyebrow">YOUR PERSONAL COMMAND CENTER</p><h1>Good to see you, <span>Boss.</span></h1><p className="subheading">{GREETING}</p></div><div className="day-count"><strong>J</strong><span>YOUR AI<br />ASSISTANT</span></div></section>
          <section className="control-grid"><article className="panel system-panel"><div className="panel-heading"><div><span className="section-index">01 / OVERVIEW</span><h2>Javis core</h2></div><span className="live-badge"><i /> LIVE</span></div><div className="core-display"><div className="radar-grid"><div className="radar-ring ring-one" /><div className="radar-ring ring-two" /><div className="radar-ring ring-three" /><div className="radar-cross cross-h" /><div className="radar-cross cross-v" /><div className="radar-sweep" /><div className="radar-core"><span>J</span><small>AI CORE</small></div><b className="radar-dot dot-one" /><b className="radar-dot dot-two" /><b className="radar-dot dot-three" /></div><div className="core-caption"><span>ASSISTANT STATUS</span><strong>Standing by<span className="blinking">_</span></strong></div></div><div className="system-stats"><div><span>VOICE ENGINE</span><strong>ELEVENLABS</strong></div><div><span>CONNECTION</span><strong>SECURE</strong></div><div><span>MEMORY</span><strong>{memories.length} SAVED</strong></div></div></article>
            <div className="side-stack"><article className="panel time-panel"><div className="panel-heading"><span className="section-index">02 / LOCAL TIME</span><span className="tiny-icon">◷</span></div><div className="time-readout">READY<span>·</span></div><div className="time-footer"><span>HERE WHEN YOU NEED ME</span><span className="pulse-line" /></div></article><article className="panel weather-panel"><div className="panel-heading"><span className="section-index">03 / VOICE</span><span className="tiny-icon">◖</span></div><div className="weather-content"><span className="weather-icon">✦</span><div><strong>{voiceEnabled ? "ON" : "OFF"}</strong><span>ElevenLabs greeting</span></div></div><div className="weather-footer"><span>YOUR PREFERENCE</span><button onClick={toggleVoice}>{voiceEnabled ? "MUTE" : "ENABLE"}</button></div></article><article className="focus-panel"><span className="focus-icon">✳</span><div><span className="section-index">FOCUS MODE</span><strong>Make room for deep work.</strong></div><button className="focus-arrow" onClick={() => setChatOpen(true)} aria-label="Ask Javis about focus">↗</button></article></div>
          </section><section className="agenda panel" id="schedule"><div className="panel-heading"><div><span className="section-index">04 / DAILY BRIEF</span><h2>On your radar</h2></div><span className="demo-tag">READY TO PLAN</span></div><div className="agenda-row"><span className="agenda-time">NOW</span><span className="agenda-marker" /><div><strong>Your day, your way</strong><span>Ask Javis to help plan priorities and remember what matters.</span></div></div></section>
        </div>
      </section>
      {chatOpen && <><button className="chat-scrim" aria-label="Close chat" onClick={() => setChatOpen(false)} /><aside className="chat-dock" aria-label="Chat with Javis"><header className="chat-top"><img className="chat-logo" src="/javis-logo.svg" alt="" /><div className="chat-title"><strong>Javis</strong><span>YOUR AI ASSISTANT</span></div><button className="more-button" onClick={() => setChatOpen(false)} aria-label="Minimize chat">−</button></header><div className="chat-context"><span>✳</span><div><strong>At your service.</strong><span>Say “remember that…” to save a detail for next time.</span></div></div>
        <div className="chat-transcript" aria-live="polite"><div className="day-divider"><span>WELCOME</span></div>{messages.map((message) => <div key={message.id} className={`chat-message-row ${message.role}`}><div className={`chat-bubble ${message.role}`}>{message.content}</div>{message.role === "assistant" && <button className="speak-button" onClick={() => void speakText(message.content)} aria-label="Play message with ElevenLabs voice">◖</button>}</div>)}{busy && <div className="chat-bubble assistant">Javis is thinking…</div>}<div ref={endRef} /></div>
        <div className="chat-bottom">{chatError && <p className="error-message" role="alert">{chatError}</p>}{voiceError && <div className="error-message" role="status">{voiceError} <button onClick={() => void speakText(GREETING)}>Play greeting</button></div>}{memories.length > 0 && <details className="memory-manager"><summary>SAVED MEMORY · {memories.length}<button onClick={(event) => { event.preventDefault(); setMemories([]); }}>CLEAR ALL</button></summary><ul>{memories.map((memory, index) => <li key={`${memory}-${index}`}>{memory}<button onClick={() => setMemories((current) => current.filter((_, i) => i !== index))} aria-label={`Forget ${memory}`}>×</button></li>)}</ul></details>}<form className="composer" onSubmit={sendMessage}><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message Javis..." aria-label="Message Javis" rows={2} /><div className="composer-actions"><span className="composer-hint">SAY “REMEMBER THAT…” TO SAVE A FACT</span><button className="send-button" type="submit" disabled={!input.trim() || busy} aria-label="Send message">↑</button></div></form><div className="voice-note"><span>✦</span> ELEVENLABS VOICE <span className="voice-note-right">MEMORY IN THIS BROWSER</span></div></div></aside></>}
      {!chatOpen && <button className="chat-launcher" onClick={() => setChatOpen(true)} aria-label="Open Javis chat"><span className="launcher-orbit">J</span><span className="launcher-label">CHAT WITH JAVIS</span><span className="launcher-status" />}</button>}
    </main>
  );
}
