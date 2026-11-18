"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { ChatDock } from "@/components/ChatDock";

export default function Home() {
  const { data: session, status } = useSession();
  const [time, setTime] = useState("--:--");
  const [date, setDate] = useState("LOCAL TIME");
  const [voice, setVoice] = useState(false);
  useEffect(() => {
    const refresh = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setDate(now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }).toUpperCase());
    };
    refresh(); const timer = window.setInterval(refresh, 30_000);
    try { setVoice(localStorage.getItem("javis.voice-greeting.v1") === "on"); } catch { /* Optional preference */ }
    return () => window.clearInterval(timer);
  }, []);
  function toggleVoice() {
    setVoice((current) => { const next = !current; try { localStorage.setItem("javis.voice-greeting.v1", next ? "on" : "off"); } catch { /* Optional preference */ } return next; });
  }

  return (
    <main className="app-shell" id="home">
      <aside className="rail"><a className="brand-mark" href="#home" aria-label="Javis home"><img src="/javis-logo.svg" alt="Javis" /></a><nav aria-label="Main navigation"><a className="rail-link selected" href="#home" aria-label="Dashboard">◈</a><a className="rail-link" href="#assistant" aria-label="Assistant">⌘</a><a className="rail-link" href="#schedule" aria-label="Schedule">▦</a></nav><span className="connection-dot" title="System online" /></aside>
      <section className="main-area">
        <header className="topbar"><div className="wordmark"><img src="/javis-logo.svg" alt="" /><span>PERSONAL SYSTEM</span></div><div className="topbar-right"><span className="online-label"><i /> SYSTEM ONLINE</span><button className={`voice-toggle ${voice ? "is-enabled" : ""}`} onClick={toggleVoice} aria-pressed={voice}>{voice ? "◖ SOUND ON" : "◖ SOUND OFF"}</button>{status === "authenticated" ? <button className="connect-button connected" onClick={() => signOut()} title={`Disconnect ${session.user?.email ?? "Microsoft account"}`}>MS CONNECTED · DISCONNECT</button> : <button className="connect-button" onClick={() => signIn("azure-ad")} disabled={status === "loading"}>{status === "loading" ? "CHECKING..." : "CONNECT MICROSOFT"}</button>}</div></header>
        <div className="workspace"><section className="intro-row"><div><p className="eyebrow">YOUR PERSONAL COMMAND CENTER</p><h1>Good to see you, <span>Boss.</span></h1><p className="subheading">Javis is online and ready when you are.</p></div><div className="day-count"><strong>J</strong><span>YOUR AI<br />ASSISTANT</span></div></section>
          <section className="control-grid"><article className="panel system-panel"><div className="panel-heading"><div><span className="section-index">01 / OVERVIEW</span><h2>Javis core</h2></div><span className="live-badge"><i /> LIVE</span></div><div className="core-display"><div className="radar-grid"><div className="radar-ring ring-one" /><div className="radar-ring ring-two" /><div className="radar-ring ring-three" /><div className="radar-cross cross-h" /><div className="radar-cross cross-v" /><div className="radar-sweep" /><div className="radar-core"><span>J</span><small>AI CORE</small></div><b className="radar-dot dot-one" /><b className="radar-dot dot-two" /><b className="radar-dot dot-three" /></div><div className="core-caption"><span>ASSISTANT STATUS</span><strong>Standing by<span className="blinking">_</span></strong></div></div><div className="system-stats"><div><span>AI ENGINE</span><strong>OPENAI</strong></div><div><span>VOICE</span><strong>ELEVENLABS</strong></div><div><span>TIME</span><strong>{time}</strong></div></div></article>
            <div className="side-stack"><article className="panel time-panel"><div className="panel-heading"><span className="section-index">02 / LOCAL TIME</span><span className="tiny-icon">◷</span></div><div className="time-readout">{time}</div><div className="time-footer"><span>{date}</span><span className="pulse-line" /></div></article><article className="panel weather-panel"><div className="panel-heading"><span className="section-index">03 / AUDIO</span><span className="tiny-icon">◖</span></div><div className="weather-content"><span className="weather-icon">✦</span><div><strong>{voice ? "ON" : "OFF"}</strong><span>Voice greeting preference</span></div></div><div className="weather-footer"><span>ELEVENLABS</span><button onClick={toggleVoice}>{voice ? "MUTE" : "ENABLE"}</button></div></article><article className="focus-panel"><span className="focus-icon">✳</span><div><span className="section-index">FOCUS MODE</span><strong>Make room for deep work.</strong></div><a className="focus-arrow" href="#assistant" aria-label="Go to Javis chat">↗</a></article></div>
          </section><section className="agenda panel" id="schedule"><div className="panel-heading"><div><span className="section-index">04 / DAILY BRIEF</span><h2>On your radar</h2></div><span className="demo-tag">READY TO PLAN</span></div><div className="agenda-row"><span className="agenda-time">NOW</span><span className="agenda-marker" /><div><strong>Your day, your way</strong><span>Ask Javis to plan priorities, search Outlook, or find OneNote notes.</span></div></div></section>
        </div>
      </section>
      <div id="assistant"><ChatDock /></div>
    </main>
  );
}
