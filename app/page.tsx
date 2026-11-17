"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "assistant" | "user"; content: string; id: number };

const initialMessages: Message[] = [
  { id: 1, role: "assistant", content: "Systems online. I'm Javis — your personal assistant. What can I take off your plate?" }
];

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    const userMessage: Message = { id: nextId.current++, role: "user", content: text };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    // The conversation UI is ready to connect to an AI backend; no provider is configured yet.
    window.setTimeout(() => {
      setMessages((current) => [...current, {
        id: nextId.current++, role: "assistant",
        content: "I'm here and ready to help. Connect an AI chat provider to give me live answers; for now, you can explore the interface and try my ElevenLabs voice."
      }]);
    }, 350);
  }

  async function speak(message: Message) {
    if (speakingId !== null) return;
    setVoiceError("");
    setSpeakingId(message.id);
    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.content })
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? "Voice generation failed.");
      }
      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      audio.onended = () => { URL.revokeObjectURL(audioUrl); setSpeakingId(null); };
      audio.onerror = () => { URL.revokeObjectURL(audioUrl); setSpeakingId(null); setVoiceError("Audio playback failed."); };
      await audio.play();
    } catch (error) {
      setSpeakingId(null);
      setVoiceError(error instanceof Error ? error.message : "Could not reach voice service.");
    }
  }

  function dictate() {
    type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
    type SpeechRecognition = { lang: string; interimResults: boolean; onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null; onend: (() => void) | null; start: () => void };
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setVoiceError("Voice input isn't supported in this browser."); return; }
    setVoiceError("");
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return (
    <main className="app-shell">
      <aside className="rail">
        <a className="brand-mark" href="#home" aria-label="Javis home">J<span>.</span></a>
        <nav aria-label="Main navigation">
          <a className="rail-link selected" href="#home" aria-label="Dashboard" title="Dashboard"><span>◈</span></a>
          <a className="rail-link" href="#assistant" aria-label="Assistant chat" title="Assistant"><span>⌘</span></a>
          <a className="rail-link" href="#schedule" aria-label="Schedule" title="Schedule"><span>▦</span></a>
        </nav>
        <div className="rail-bottom"><span className="connection-dot" title="Systems online" /></div>
      </aside>

      <section className="main-area" id="home">
        <header className="topbar">
          <div className="wordmark"><span className="tiny-orbit">◉</span> JAVIS <span className="topbar-divider">/</span> PERSONAL SYSTEM</div>
          <div className="topbar-right"><span className="online-label"><i /> ALL SYSTEMS NOMINAL</span><span className="date-label">TUESDAY · 09:41 AM</span><div className="user-chip">JB</div></div>
        </header>

        <div className="workspace">
          <section className="intro-row">
            <div><p className="eyebrow">YOUR PERSONAL COMMAND CENTER</p><h1>Good morning, <span>Boss.</span></h1><p className="subheading">A clear view of today. Let’s make it count.</p></div>
            <div className="day-count"><strong>29</strong><span>OCTOBER<br />TUESDAY</span></div>
          </section>

          <section className="control-grid" aria-label="Assistant dashboard">
            <article className="panel system-panel">
              <div className="panel-heading"><div><span className="section-index">01 / OVERVIEW</span><h2>Javis core</h2></div><span className="live-badge"><i /> LIVE</span></div>
              <div className="core-display">
                <div className="radar-grid" aria-hidden="true"><div className="radar-ring ring-one" /><div className="radar-ring ring-two" /><div className="radar-ring ring-three" /><div className="radar-cross cross-h" /><div className="radar-cross cross-v" /><div className="radar-sweep" /><div className="radar-core"><span>J</span><small>AI CORE</small></div><b className="radar-dot dot-one" /><b className="radar-dot dot-two" /><b className="radar-dot dot-three" /></div>
                <div className="core-caption"><span>ASSISTANT STATUS</span><strong>Standing by<span className="blinking">_</span></strong></div>
              </div>
              <div className="system-stats"><div><span>VOICE ENGINE</span><strong><i /> ELEVENLABS</strong></div><div><span>CONNECTION</span><strong><i /> SECURE</strong></div><div><span>MODE</span><strong>PERSONAL</strong></div></div>
            </article>

            <div className="side-stack">
              <article className="panel time-panel"><div className="panel-heading"><span className="section-index">02 / LOCAL TIME</span><span className="tiny-icon">◷</span></div><div className="time-readout">09<span>:</span>41<small>AM</small></div><div className="time-footer"><span>YOUR DAY IS UNDERWAY</span><span className="pulse-line" /></div></article>
              <article className="panel weather-panel"><div className="panel-heading"><span className="section-index">03 / CONDITIONS</span><span className="tiny-icon">⌁</span></div><div className="weather-content"><span className="weather-icon">☼</span><div><strong>72°</strong><span>Clear skies</span></div></div><div className="weather-footer"><span>WEATHER DEMO</span><span>LOCATION NOT SET</span></div></article>
              <article className="focus-panel"><div className="focus-icon">✳</div><div><span className="section-index">FOCUS MODE</span><strong>Make room for deep work.</strong></div><span className="focus-arrow">↗</span></article>
            </div>
          </section>

          <section className="agenda panel" id="schedule"><div className="panel-heading"><div><span className="section-index">04 / DAILY BRIEF</span><h2>On your radar</h2></div><span className="demo-tag">DEMO DATA</span></div><div className="agenda-row"><span className="agenda-time">10:30</span><span className="agenda-marker" /><div><strong>Make today yours</strong><span>Your schedule will appear here when you connect a calendar.</span></div><span className="agenda-kind">OPEN SLOT</span></div></section>
        </div>
      </section>

      <aside className="chat-dock" id="assistant" aria-label="Chat with Javis">
        <header className="chat-top"><div className="chat-avatar"><span>J</span><i /></div><div className="chat-title"><strong>Javis</strong><span>YOUR AI ASSISTANT</span></div><button className="more-button" aria-label="Chat options">···</button></header>
        <div className="chat-context"><span className="context-spark">✳</span><div><strong>At your service.</strong><span>Ask me anything or tell me what’s on your mind.</span></div></div>
        <div className="chat-transcript" aria-live="polite">
          <div className="day-divider"><span>TODAY</span></div>
          {messages.map((message) => <div key={message.id} className={`chat-message-row ${message.role}`}><div className={`chat-bubble ${message.role}`}>{message.content}</div>{message.role === "assistant" && <button className={`speak-button ${speakingId === message.id ? "is-speaking" : ""}`} onClick={() => speak(message)} aria-label="Play with ElevenLabs voice" title="Speak this message with ElevenLabs">{speakingId === message.id ? "◖))" : "◖"}</button>}</div>)}
          <div ref={endRef} />
        </div>
        <div className="chat-bottom">
          {voiceError && <p className="voice-error" role="status">{voiceError}</p>}
          <form className="composer" onSubmit={sendMessage}><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message Javis..." aria-label="Message Javis" rows={2} /><div className="composer-actions"><button type="button" className={`mic-button ${listening ? "listening" : ""}`} onClick={dictate} aria-label="Dictate a message" title="Dictate"><span>♩</span></button><span className="composer-hint">ENTER TO SEND</span><button type="submit" className="send-button" disabled={!input.trim()} aria-label="Send message">↑</button></div></form>
          <div className="voice-note"><span>✦</span> ELEVENLABS VOICE READY <span className="voice-note-right">VOICE PLAYBACK ON DEMAND</span></div>
        </div>
      </aside>
    </main>
  );
}
