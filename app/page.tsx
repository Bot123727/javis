"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

export default function Home() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Good evening. I'm Javis. What would you like to handle?" }
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages((current) => [...current, { role: "user", content: text }]);
    setInput("");

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I’m ready to help. AI provider integration will connect this interface to your model."
        }
      ]);
    }, 550);
  }

  return (
    <main className="dashboard">
      <header>
        <div>
          <p className="eyebrow">PERSONAL WORKSPACE</p>
          <h1>Good evening</h1>
        </div>
        <button className="avatar" aria-label="Open profile">JB</button>
      </header>

      <section className="grid">
        <article className="card hero">
          <p className="eyebrow">TODAY</p>
          <h2>Your day at a glance</h2>
          <div className="metrics">
            <div><strong>3</strong><span>Meetings</span></div>
            <div><strong>5</strong><span>Tasks</span></div>
            <div><strong>2h</strong><span>Focus time</span></div>
          </div>
        </article>
        <article className="card">
          <p className="eyebrow">UP NEXT</p>
          <h3>Team sync</h3>
          <p className="muted">4:30 PM · 30 min</p>
        </article>
      </section>

      {open && (
        <aside className="chat-panel" aria-label="Javis chat">
          <header className="chat-header">
            <div className="status"><span /> Javis</div>
            <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </header>
          <div className="messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>{message.content}</div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={sendMessage}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Javis anything…"
              aria-label="Message Javis"
            />
            <button type="submit" aria-label="Send message">↗</button>
          </form>
        </aside>
      )}

      {!open && (
        <button className="chat-button" onClick={() => setOpen(true)} aria-label="Open Javis chat">
          J
        </button>
      )}
    </main>
  );
}
