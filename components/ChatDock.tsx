"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = { id: string; role: "assistant" | "user"; content: string };
type Conversation = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };
const STORAGE_KEY = "javis.chat.conversations.v1";
const MEMORY_KEY = "javis.memories.v1";
const GREETING = "Good to see you. I'm Javis. What can I help you with today?";
const SUGGESTIONS = ["Help me plan my day", "Summarize my recent emails", "Find my OneNote notes"];

function makeConversation(): Conversation {
  return { id: crypto.randomUUID(), title: "New conversation", updatedAt: Date.now(), messages: [{ id: crypto.randomUUID(), role: "assistant", content: GREETING }] };
}

function loadConversations(): Conversation[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((item): item is Conversation => item && typeof item.id === "string" && typeof item.title === "string" && Array.isArray(item.messages))
        .map((item) => ({ ...item, messages: item.messages.filter((message: ChatMessage) => message && (message.role === "assistant" || message.role === "user") && typeof message.content === "string") }));
      if (valid.length) return valid.slice(0, 40);
    }
  } catch { /* Start a fresh local conversation if saved data is malformed. */ }
  return [makeConversation()];
}

export function ChatDock() {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [speakingId, setSpeakingId] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const saved = loadConversations();
    setConversations(saved);
    setActiveId(saved[0].id);
    loadedRef.current = true;
  }, []);
  useEffect(() => {
    if (loadedRef.current && conversations.length) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); } catch { setError("Browser storage is full; chat history may not be saved."); }
    }
  }, [conversations]);
  useEffect(() => { transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" }); }, [conversations, activeId, open, busy]);
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); setHistoryOpen(false); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") { event.preventDefault(); setOpen((value) => !value); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const active = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];
  const filtered = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())), [conversations, search]);

  function updateActive(transform: (conversation: Conversation) => Conversation) {
    setConversations((items) => items.map((item) => item.id === activeId ? transform(item) : item));
  }
  function startNewChat() {
    abortRef.current?.abort();
    const conversation = makeConversation();
    setConversations((items) => [conversation, ...items].slice(0, 40));
    setActiveId(conversation.id);
    setInput(""); setError(""); setBusy(false); setOpen(true); setHistoryOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }
  function deleteConversation(id: string) {
    const remaining = conversations.filter((item) => item.id !== id);
    if (!remaining.length) { const fresh = makeConversation(); setConversations([fresh]); setActiveId(fresh.id); }
    else { setConversations(remaining); if (id === activeId) setActiveId(remaining[0].id); }
  }
  function readMemories() {
    try { const value: unknown = JSON.parse(localStorage.getItem(MEMORY_KEY) ?? "[]"); return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 30) : []; }
    catch { return []; }
  }

  async function askJavis(messages: ChatMessage[], signal: AbortSignal) {
    const response = await fetch("/api/chat", {
      method: "POST", signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages.slice(-20).map(({ role, content }) => ({ role, content })), memories: readMemories() })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Chat request failed.");
    if (typeof result.reply !== "string") throw new Error("Javis returned an unexpected response.");
    return result.reply as string;
  }

  async function submitText(text: string, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const value = text.trim();
    if (!value || busy || !active) return;
    setInput(""); setError(""); setOpen(true); setHistoryOpen(false);

    const rememberMatch = value.match(/^remember(?: that)?\s+(.+)$/i);
    if (rememberMatch) {
      const fact = rememberMatch[1].trim().replace(/[.!?]+$/, "").slice(0, 300);
      if (fact) {
        try {
          const current = readMemories();
          localStorage.setItem(MEMORY_KEY, JSON.stringify([...current.filter((item) => item.toLowerCase() !== fact.toLowerCase()), fact].slice(-30)));
          const next = [...active.messages, { id: crypto.randomUUID(), role: "user" as const, content: value }, { id: crypto.randomUUID(), role: "assistant" as const, content: `Got it — I’ll remember “${fact}” in this browser.` }];
          updateActive((conversation) => ({ ...conversation, title: conversation.title === "New conversation" ? value.slice(0, 42) : conversation.title, messages: next, updatedAt: Date.now() }));
        } catch { setError("Could not save memory in this browser."); }
      }
      return;
    }
    if (/^(forget|clear|delete) (all )?(my )?(memories|memory)$/i.test(value)) {
      try { localStorage.removeItem(MEMORY_KEY); } catch { /* Storage is optional. */ }
      updateActive((conversation) => ({ ...conversation, messages: [...conversation.messages, { id: crypto.randomUUID(), role: "user", content: value }, { id: crypto.randomUUID(), role: "assistant", content: "I cleared the memories saved in this browser." }], updatedAt: Date.now() }));
      return;
    }

    const conversationId = active.id;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: value };
    const thread = [...active.messages, userMessage];
    updateActive((conversation) => ({ ...conversation, title: conversation.title === "New conversation" ? value.replace(/\s+/g, " ").slice(0, 42) : conversation.title, messages: thread, updatedAt: Date.now() }));
    const controller = new AbortController(); abortRef.current = controller; setBusy(true);
    try {
      const reply = await askJavis(thread, controller.signal);
      setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, messages: [...item.messages, { id: crypto.randomUUID(), role: "assistant", content: reply }], updatedAt: Date.now() } : item));
    } catch (reason) {
      if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
    } finally { if (abortRef.current === controller) { abortRef.current = null; setBusy(false); } }
  }

  async function retryLast() {
    if (busy || !active) return;
    const lastUserIndex = active.messages.map((item) => item.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    const thread = active.messages.slice(0, lastUserIndex + 1);
    updateActive((conversation) => ({ ...conversation, messages: thread, updatedAt: Date.now() }));
    const controller = new AbortController(); abortRef.current = controller; setBusy(true); setError("");
    try {
      const reply = await askJavis(thread, controller.signal);
      setConversations((items) => items.map((item) => item.id === active.id ? { ...item, messages: [...thread, { id: crypto.randomUUID(), role: "assistant", content: reply }], updatedAt: Date.now() } : item));
    } catch (reason) { if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message); }
    finally { if (abortRef.current === controller) { abortRef.current = null; setBusy(false); } }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
  }
  async function copyMessage(message: ChatMessage) {
    try { await navigator.clipboard.writeText(message.content); setCopiedId(message.id); window.setTimeout(() => setCopiedId(""), 1400); }
    catch { setError("Clipboard access is unavailable in this browser."); }
  }
  async function speak(message: ChatMessage) {
    setError(""); setSpeakingId(message.id);
    try {
      const response = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message.content }) });
      if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error ?? "Voice is not configured."); }
      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      audio.onended = () => { URL.revokeObjectURL(audioUrl); setSpeakingId(""); };
      audio.onerror = () => { URL.revokeObjectURL(audioUrl); setSpeakingId(""); };
      await audio.play();
    } catch (reason) { setSpeakingId(""); setError(reason instanceof Error ? reason.message : "Unable to play speech."); }
  }
  function editMessage(message: ChatMessage) { setInput(message.content); inputRef.current?.focus(); }
  function clearConversation() {
    if (!active) return;
    updateActive((conversation) => ({ ...conversation, title: "New conversation", messages: [{ id: crypto.randomUUID(), role: "assistant", content: GREETING }], updatedAt: Date.now() }));
    setError("");
  }

  if (!active) return null;
  return (
    <>
      {!open && <button className="javis-launcher" onClick={() => setOpen(true)} aria-label="Open Javis chat"><img src="/javis-logo.svg" alt="" /><span>CHAT WITH JAVIS</span><i /></button>}
      {open && <aside className="javis-chat" aria-label="Javis chat">
        <header className="javis-chat-header"><img src="/javis-logo.svg" alt="" /><div><strong>Javis</strong><small>PERSONAL AI ASSISTANT</small></div><button onClick={startNewChat} title="New chat" aria-label="New chat">＋</button><button onClick={() => setHistoryOpen((value) => !value)} title="Conversation history" aria-label="Conversation history" aria-pressed={historyOpen}>◷</button><button onClick={() => setOpen(false)} title="Minimize chat" aria-label="Minimize chat">−</button></header>
        <div className="javis-chat-layout">
          {historyOpen && <section className="javis-history" aria-label="Conversation history"><div className="history-heading"><strong>History</strong><button onClick={startNewChat}>＋ New</button></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
            <div className="history-list">{filtered.map((conversation) => <div key={conversation.id} className={`history-item ${conversation.id === active.id ? "active" : ""}`}><button className="history-select" onClick={() => { setActiveId(conversation.id); setError(""); setHistoryOpen(false); }}>{conversation.title}<small>{new Date(conversation.updatedAt).toLocaleDateString()}</small></button><button className="history-delete" onClick={() => deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}>×</button></div>)}{filtered.length === 0 && <p className="history-empty">No matching conversations.</p>}</div>
          </section>}
          <div className="javis-chat-main">
            <div className="javis-chat-toolbar"><span><i /> {statusLabel(busy)}</span><button onClick={clearConversation} title="Clear this chat">CLEAR CHAT</button></div>
            <div className="javis-transcript" ref={transcriptRef} aria-live="polite">
              {active.messages.map((message, index) => <article key={message.id} className={`javis-message ${message.role}`}><div className="javis-bubble">{message.content}</div><div className="message-tools">{message.role === "user" && <button onClick={() => editMessage(message)} title="Edit message">EDIT</button>}{message.role === "assistant" && <><button onClick={() => void copyMessage(message)} title="Copy response">{copiedId === message.id ? "COPIED" : "COPY"}</button><button onClick={() => void speak(message)} title="Read response aloud">{speakingId === message.id ? "PLAYING" : "SPEAK"}</button>{index === active.messages.length - 1 && <button onClick={retryLast} title="Regenerate response">RETRY</button>}</>}</div></article>)}
              {active.messages.length === 1 && <div className="javis-suggestions"><span>START WITH</span>{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => void submitText(suggestion)}>{suggestion} <b>↗</b></button>)}</div>}
              {busy && <div className="javis-thinking"><i /><i /><i /> Javis is thinking…</div>}
            </div>
            {error && <div className="javis-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
            <form className="javis-composer" onSubmit={(event) => void submitText(input, event)}><textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onComposerKeyDown} placeholder="Message Javis… (Shift+Enter for a new line)" aria-label="Message Javis" rows={2} /><div><small>ENTER SENDS · SHIFT+ENTER ADDS A LINE</small><button type="button" className="cancel-button" onClick={() => { abortRef.current?.abort(); setBusy(false); }} disabled={!busy}>STOP</button><button className="javis-send" type="submit" disabled={!input.trim() || busy} aria-label="Send message">↑</button></div></form>
            <footer className="javis-chat-footer"><span>YOUR CHATS SAVE IN THIS BROWSER</span><kbd>⌘/CTRL + J</kbd></footer>
          </div>
        </div>
      </aside>}
    </>
  );
}

function statusLabel(busy: boolean) { return busy ? "THINKING" : "READY TO HELP"; }
