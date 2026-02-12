"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearTokens, getAccessToken } from "@/lib/api";

type Message = { id: string; role: "user" | "assistant"; content: string; ts: string };
type Thread = { id: string; title: string; updatedAt: string; messages: Message[] };

const STORAGE_KEY = "chatgpt_like_ui_v2";

const randomId = () => {
  try {
    const a = new Uint8Array(8);
    crypto.getRandomValues(a);
    return Array.from(a)
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
};

const nowISO = () => new Date().toISOString();

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
};

const escapeHtml = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function renderMarkdownish(text: string) {
  let t = escapeHtml(text);
  t = t.replace(/```([\s\S]*?)```/g, (_m, p1) => {
    const code = p1.replace(/^\n/, "");
    const id = randomId();
    return `
      <pre data-code-id="${id}">
        <div class="codeTools">
          <button class="codeBtn" data-copy-code="${id}" title="Copy code">⧉</button>
        </div>
<code>${code}</code></pre>
    `;
  });
  t = t.replace(/`([^`]+?)`/g, (_m, p1) => `<code class="inline">${p1}</code>`);
  t = t.replace(/(https?:\/\/[^\s<]+)/g, (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`);
  t = t.replace(/\n/g, "<br/>");
  return `<div class="md">${t}</div>`;
}

export default function ChatPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stopFlag, setStopFlag] = useState(false);
  const [model, setModel] = useState("Demo");
  const [threadSearch, setThreadSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatWrapRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const stopRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data?.threads)) setThreads(data.threads);
        if (data?.activeThreadId) setActiveThreadId(data.activeThreadId);
        if (data?.model) setModel(data.model);
      }
    } catch {
      /* ignore */
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 2, threads, activeThreadId, model })
    );
  }, [threads, activeThreadId, model]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const filteredThreads = useMemo(() => {
    const f = threadSearch.trim().toLowerCase();
    const items = [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!f) return items;
    return items.filter((t) => {
      const last = t.messages[t.messages.length - 1]?.content || "";
      return (t.title || "").toLowerCase().includes(f) || last.toLowerCase().includes(f);
    });
  }, [threads, threadSearch]);

  const setToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1200);
  };

  const setStatusText = (text: string) => {
    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.textContent = text;
  };

  const setBusyState = (b: boolean) => {
    setBusy(b);
    setStopFlag(false);
    stopRef.current = false;
    setStatusText(b ? "Thinking..." : "Ready");
  };

  const newThread = () => {
    const id = randomId();
    const t: Thread = {
      id,
      title: "New chat",
      updatedAt: nowISO(),
      messages: [
        {
          id: randomId(),
          role: "assistant",
          content:
            "Chào cậu chủ 👋\n\nĐây là UI template giống ChatGPT hơn:\n- Sidebar threads + mobile drawer\n- Markdown + code block copy\n- Search trong chat\n- Regenerate / Stop\n\nHỏi mình bất kỳ điều gì nhé.",
          ts: nowISO(),
        },
      ],
    };
    setThreads((prev) => [t, ...prev]);
    setActiveThreadId(id);
    return t;
  };

  const ensureThread = () => activeThread || newThread();

  const updateThread = (id: string, updater: (t: Thread) => Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const addMessage = (threadId: string, msg: Message) => {
    updateThread(threadId, (t) => ({
      ...t,
      messages: [...t.messages, msg],
      updatedAt: nowISO(),
    }));
  };

  const renderAll = () => {
    const t = activeThread;
    if (!t) return;
    setThreads((prev) => [...prev]);
  };

  const callAI = async (messages: { role: string; content: string }[]) => {
    const last = messages[messages.length - 1]?.content || "";
    await new Promise((r) => setTimeout(r, 250));
    if (/code|html|css|js/i.test(last)) {
      return [
        "Mình đưa ví dụ nhanh nhé:",
        "",
        "```html",
        "<div class=\"card\">Xin chào</div>",
        "```",
        "",
        "Bạn muốn component nào: sidebar, composer, hay message bubble?",
      ].join("\n");
    }
    return [
      "Mình đã nhận câu hỏi của cậu chủ.",
      "",
      "- Nếu cậu chủ muốn mình trả lời chi tiết hơn, hãy cho mình thêm bối cảnh.",
      "- Bạn cũng có thể yêu cầu mình xuất `code` hoặc `checklist`.",
      "",
      "Gợi ý: thử hỏi `Viết UI chat giống ChatGPT bằng HTML/CSS`.",
    ].join("\n");
  };

  const streamText = async (threadId: string, msgId: string, fullText: string) => {
    const chunks = fullText.split(/(\s+)/);
    let acc = "";
    for (const ch of chunks) {
      if (stopRef.current) break;
      acc += ch;
      updateThread(threadId, (t) => ({
        ...t,
        messages: t.messages.map((m) => (m.id === msgId ? { ...m, content: acc } : m)),
        updatedAt: nowISO(),
      }));
      await new Promise((r) => setTimeout(r, 12));
    }
    return acc;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const t = ensureThread();
    if (t.title === "New chat") {
      updateThread(t.id, (thr) => ({ ...thr, title: text.slice(0, 34) }));
    }

    const userMsg: Message = { id: randomId(), role: "user", content: text, ts: nowISO() };
    setInput("");
    addMessage(t.id, userMsg);

    const placeholder: Message = { id: randomId(), role: "assistant", content: "", ts: nowISO() };
    addMessage(t.id, placeholder);

    setBusyState(true);
    try {
      const threadNow = threads.find((x) => x.id === t.id) || t;
      const payload = [...threadNow.messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await callAI(payload);
      const finalText = await streamText(t.id, placeholder.id, reply);
      updateThread(t.id, (thr) => ({
        ...thr,
        messages: thr.messages.map((m) =>
          m.id === placeholder.id ? { ...m, content: finalText, ts: nowISO() } : m
        ),
        updatedAt: nowISO(),
      }));
    } catch (err: any) {
      const msg = "Lỗi: " + (err?.message || err);
      updateThread(t.id, (thr) => ({
        ...thr,
        messages: thr.messages.map((m) => (m.id === placeholder.id ? { ...m, content: msg } : m)),
        updatedAt: nowISO(),
      }));
      setStatusText("Error");
    } finally {
      setBusyState(false);
    }
  };

  const handleRegenerate = async () => {
    if (busy || !activeThread) return;
    const t = activeThread;
    const lastUser = [...t.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      setToastMsg("Không có user msg");
      return;
    }

    let msgs = [...t.messages];
    const lastAssistantIdx = [...msgs].reverse().findIndex((m) => m.role === "assistant");
    if (lastAssistantIdx >= 0) {
      const idx = msgs.length - 1 - lastAssistantIdx;
      msgs = msgs.filter((_, i) => i !== idx);
    }
    const placeholder: Message = { id: randomId(), role: "assistant", content: "", ts: nowISO() };
    msgs.push(placeholder);
    updateThread(t.id, (thr) => ({ ...thr, messages: msgs, updatedAt: nowISO() }));

    setBusyState(true);
    try {
      const payload = msgs.map((m) => ({ role: m.role, content: m.content }));
      const reply = await callAI(payload);
      const finalText = await streamText(t.id, placeholder.id, reply);
      updateThread(t.id, (thr) => ({
        ...thr,
        messages: thr.messages.map((m) =>
          m.id === placeholder.id ? { ...m, content: finalText, ts: nowISO() } : m
        ),
        updatedAt: nowISO(),
      }));
      setToastMsg("Regenerated");
    } catch (err: any) {
      const msg = "Lỗi: " + (err?.message || err);
      updateThread(t.id, (thr) => ({
        ...thr,
        messages: thr.messages.map((m) => (m.id === placeholder.id ? { ...m, content: msg } : m)),
        updatedAt: nowISO(),
      }));
      setStatusText("Error");
    } finally {
      setBusyState(false);
    }
  };

  const handleCopyChat = async () => {
    if (!activeThread) return;
    const text = activeThread.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setToastMsg("Đã copy chat");
    } catch {
      setToastMsg("Copy thất bại");
    }
  };

  const handleExport = () => {
    const payload = {
      exportedAt: nowISO(),
      v: 2,
      activeThreadId,
      model,
      threads,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chatgpt_like_export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToastMsg("Đã export");
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.threads)) throw new Error("Sai định dạng");
    setThreads(data.threads);
    setActiveThreadId(data.activeThreadId || data.threads[0]?.id || null);
    setModel(data.model || "Demo");
    setToastMsg("Import OK");
  };

  const handleClear = () => {
    if (!activeThread) return;
    updateThread(activeThread.id, (t) => ({ ...t, messages: [], updatedAt: nowISO() }));
    setToastMsg("Đã clear");
  };

  const handleLogout = () => {
    clearTokens();
    router.push("/login");
  };

  const startRename = () => {
    if (!activeThread) return;
    setRenameValue(activeThread.title || "New chat");
    setIsRenaming(true);
  };

  const commitRename = () => {
    if (!activeThread) return;
    const next = renameValue.trim();
    updateThread(activeThread.id, (t) => ({
      ...t,
      title: next || "New chat",
      updatedAt: nowISO(),
    }));
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameValue(activeThread?.title || "");
  };

  const handleAutoName = async () => {
    if (!activeThread) return;
    const seed =
      activeThread.messages.find((m) => m.role === "user")?.content ||
      activeThread.messages[0]?.content ||
      "New chat";
    const cleaned = seed.replace(/\s+/g, " ").trim().slice(0, 42);
    const mockTitle = cleaned ? `Auto: ${cleaned}` : "Auto: New chat";
    updateThread(activeThread.id, (t) => ({
      ...t,
      title: mockTitle,
      updatedAt: nowISO(),
    }));
    setToastMsg("Đã tự động đặt tên (mock)");
  };

  const searchInChat = (q: string) => {
    if (!activeThread) return;
    const qq = q.trim().toLowerCase();
    if (!qq) {
      setHighlightId(null);
      return;
    }
    const first = activeThread.messages.find((m) => m.content.toLowerCase().includes(qq));
    if (first) {
      setHighlightId(first.id);
      const el = messageRefs.current.get(first.id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useEffect(() => {
    if (!threads.length) {
      const t = newThread();
      setActiveThreadId(t.id);
    } else if (!activeThreadId) {
      setActiveThreadId(threads[0]?.id || null);
    }
  }, [threads, activeThreadId]);

  useEffect(() => {
    setIsRenaming(false);
    setRenameValue(activeThread?.title || "");
  }, [activeThreadId, activeThread?.title]);

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.focus();
  }, [isRenaming]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [activeThreadId]);

  useEffect(() => {
    const wrap = chatWrapRef.current;
    if (!wrap) return;
    const distanceFromBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight;
    if (distanceFromBottom < 160) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [activeThread?.messages]);

  return (
    <div className="appRoot">
      <div className="app">
        {/* Sidebar (desktop) */}
        <aside className="sidebar">
          <div className="brand">
            <div className="logo" />
            <div>
              <h1>ClinicPT</h1>
              <p>ClinicPT Chat</p>
            </div>
          </div>

          <button className="btn primary" onClick={newThread}>
            + New chat
          </button>

          <div className="row">
            <input
              className="search"
              placeholder="Tìm hội thoại..."
              style={{ width: "100%" }}
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
            />
          </div>

          <div className="threadList">
            {filteredThreads.map((t) => {
              const last = t.messages[t.messages.length - 1]?.content || "…";
              return (
                <div
                  key={t.id}
                  className={`thread ${t.id === activeThreadId ? "active" : ""}`}
                  onClick={() => {
                    setActiveThreadId(t.id);
                    setDrawerOpen(false);
                  }}
                >
                  <p className="t">{t.title || "New chat"}</p>
                  <p className="s">{last.replace(/\s+/g, " ").slice(0, 60)}</p>
                </div>
              );
            })}
          </div>

          <div className="sidebarFooter">
            <span className="miniPill">User: cậu chủ</span>
            <span className="miniPill">saved</span>
          </div>
        </aside>

        {/* Drawer (mobile) */}
        <div className={`backdrop ${drawerOpen ? "show" : ""}`} onClick={() => setDrawerOpen(false)} />
        <aside className={`drawer ${drawerOpen ? "show" : ""}`}>
          <div className="closeRow">
            <div className="brand" style={{ flex: 1 }}>
              <div className="logo" />
              <div>
                <h1>ClinicPT</h1>
                <p>ClinicPT Chat</p>
              </div>
            </div>
            <button className="closeBtn" onClick={() => setDrawerOpen(false)}>
              ✕
            </button>
          </div>
          <button className="btn primary" onClick={() => { newThread(); setDrawerOpen(false); }}>
            + New chat
          </button>
          <input
            className="search"
            placeholder="Tìm hội thoại..."
            style={{ width: "100%" }}
            value={threadSearch}
            onChange={(e) => setThreadSearch(e.target.value)}
          />
          <div className="threadList">
            {filteredThreads.map((t) => {
              const last = t.messages[t.messages.length - 1]?.content || "…";
              return (
                <div
                  key={t.id}
                  className={`thread ${t.id === activeThreadId ? "active" : ""}`}
                  onClick={() => {
                    setActiveThreadId(t.id);
                    setDrawerOpen(false);
                  }}
                >
                  <p className="t">{t.title || "New chat"}</p>
                  <p className="s">{last.replace(/\s+/g, " ").slice(0, 60)}</p>
                </div>
              );
            })}
          </div>
          <div className="sidebarFooter">
            <span className="miniPill">User: cậu chủ</span>
            <span className="miniPill">saved</span>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <header className="topbar">
            <div className="left">
              <button className="hamburger" onClick={() => setDrawerOpen(true)} title="Menu">
                ☰
              </button>
              <div className="pill" title="Trạng thái">
                <span className={`dot ${busy ? "ok" : "ok"}`} id="dot" />
                <span id="status">{busy ? "Thinking..." : "Ready"}</span>
              </div>
              <div className="titleWrap" id="threadTitle">
                {isRenaming ? (
                  <div className="titleEdit">
                    <input
                      ref={renameInputRef}
                      className="titleInput"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                    />
                    <button className="iconbtn" title="Lưu" onClick={commitRename}>
                      ✓
                    </button>
                    <button className="iconbtn" title="Hủy" onClick={cancelRename}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <button className="titleButton" title="Đổi tên" onClick={startRename}>
                    <span className="titleText">{activeThread?.title || "New chat"}</span>
                    <span className="titleIcon">✎</span>
                  </button>
                )}
              </div>
            </div>

            <div className="actions">
              <input
                className="search"
                placeholder="Tìm trong chat..."
                value={chatSearch}
                onChange={(e) => {
                  setChatSearch(e.target.value);
                  searchInChat(e.target.value);
                }}
              />
              <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
                <option>Demo</option>
                <option>GPT-like</option>
                <option>Fast</option>
              </select>
              <button className="navBtn" title="Đặt lịch" onClick={() => router.push("/booking")}>
                Đặt lịch
              </button>
              <button className="logoutBtn" title="Đăng xuất" onClick={handleLogout}>
                Đăng xuất
              </button>
              <button className="iconbtn" title="Export JSON" onClick={handleExport}>
                ⤓
              </button>
              <button className="autoNameBtn" title="Tự động đặt tên" onClick={handleAutoName}>
                Tự động đặt tên
              </button>
              <button
                className="iconbtn"
                title="Import JSON"
                onClick={() => fileInputRef.current?.click()}
              >
                ⤒
              </button>
              <button className="iconbtn" title="Clear messages" onClick={handleClear}>
                🗑
              </button>
            </div>
          </header>

          <div className="chatWrap" id="chatWrap" ref={chatWrapRef}>
            <section className="chat" id="chat">
              {(activeThread?.messages || []).map((m) => (
                <article
                  key={m.id}
                  ref={(el) => {
                    if (el) messageRefs.current.set(m.id, el);
                    else messageRefs.current.delete(m.id);
                  }}
                  className={`message ${m.role} ${highlightId === m.id ? "hl" : ""}`}
                  onClick={async (e) => {
                    const target = e.target as HTMLElement;
                    const codeId = target.getAttribute("data-copy-code");
                    if (codeId) {
                      const pre = document.querySelector(`pre[data-code-id="${codeId}"] code`);
                      const txt = pre?.textContent || "";
                      try {
                        await navigator.clipboard.writeText(txt);
                        setToastMsg("Đã copy code");
                      } catch {
                        setToastMsg("Copy thất bại");
                      }
                    }
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdownish(m.content) }} />
                  <div className="tools">
                    <button
                      className="smallbtn"
                      title="Copy message"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(m.content);
                          setToastMsg("Đã copy");
                        } catch {
                          setToastMsg("Copy thất bại");
                        }
                      }}
                    >
                      ⧉
                    </button>
                    <button
                      className="smallbtn"
                      title="Delete"
                      onClick={() => {
                        if (!activeThread) return;
                        updateThread(activeThread.id, (t) => ({
                          ...t,
                          messages: t.messages.filter((x) => x.id !== m.id),
                          updatedAt: nowISO(),
                        }));
                      }}
                    >
                      🗑
                    </button>
                  </div>
                  <div className="meta">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="badge">{m.role}</span>
                      <span>{fmt(m.ts)}</span>
                    </div>
                    <span style={{ color: "var(--muted)" }}>{m.role === "assistant" ? `Model: ${model}` : ""}</span>
                  </div>
                </article>
              ))}
              <div ref={messagesEndRef} />
            </section>
          </div>

          <div className="composerBar">
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).focus();
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                    e.preventDefault();
                    const el = document.querySelector<HTMLInputElement>(".search");
                    el?.focus();
                  }
                }}
                disabled={busy}
              />
              <button className="send" type="submit" disabled={busy}>
                Gửi
              </button>
            </form>

            <div className="composerTools">
              <div className="leftTools">
                <button
                  className="linkBtn"
                  type="button"
                  onClick={() => {
                    if (!busy) return;
                    setStopFlag(true);
                    stopRef.current = true;
                    setToastMsg("Stopped");
                  }}
                  disabled={!busy}
                >
                  Stop
                </button>
                <button className="linkBtn" type="button" onClick={handleRegenerate} disabled={busy}>
                  Regenerate
                </button>
                <button className="linkBtn" type="button" onClick={handleCopyChat}>
                  Copy chat
                </button>
              </div>
              <div>
                Tip: <span style={{ fontFamily: "var(--mono)" }}>Ctrl+K</span> focus ·{" "}
                <span style={{ fontFamily: "var(--mono)" }}>Ctrl+F</span> tìm trong chat
              </div>
            </div>
          </div>
        </main>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            await handleImport(f);
          } catch {
            setToastMsg("Import thất bại");
          }
        }}
      />
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>

      <style jsx global>{`

        :root {
          --bg: #eaf6ff;
          --panel: #ffffff;
          --panel2: #f8fbff;
          --card: #ffffff;
          --line: #d9e6f2;
          --line2: #cfe0ef;
          --text: #0f172a;
          --muted: #64748b;
          --accent: #16b3b3;
          --accent-hover: #109a9a;
          --good: #22c55e;
          --warn: #f59e0b;
          --bad: #ef4444;
          --radius: 16px;
          --radius2: 14px;
          --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
            "Courier New", monospace;
        }
        * { box-sizing: border-box; }
        html, body { height: 100%; }
        body {
          margin: 0;
          background: linear-gradient(180deg, #eaf6ff, #f6fbff);
          color: var(--text);
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          overflow: hidden;
        }
        a { color: var(--accent); text-decoration: none; }
        a:hover { text-decoration: underline; }
        .appRoot { height: 100dvh; }
        .app { height: 100%; display: grid; grid-template-columns: 280px 1fr; }
        @media (max-width: 980px) {
          .app { grid-template-columns: 1fr; }
          .sidebar { display: none; }
          .topbar .left .hamburger { display: inline-grid; }
        }
        .sidebar {
          background: var(--panel);
          border-right: 1px solid var(--line);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          height: 100%;
          overflow-y: scroll;
          scrollbar-gutter: stable both-edges;
        }
        .brand {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 10px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: var(--panel2);
        }
        .logo {
          width: 32px; height: 32px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(22,179,179,.9), rgba(14,165,233,.75));
          box-shadow: 0 8px 18px rgba(22,179,179,.18);
        }
        .brand h1 { font-size: 13px; margin: 0; }
        .brand p { font-size: 12px; margin: 2px 0 0; color: var(--muted); }
        .btn {
          border: 1px solid var(--line);
          background: var(--panel);
          color: var(--text);
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 13px;
          cursor: pointer;
          text-align: left;
          user-select: none;
        }
        .btn.primary {
          border-color: var(--accent);
          background: var(--accent);
          color: #fff;
          font-weight: 700;
        }
        .btn:hover { border-color: var(--accent); }
        .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .threadList {
          flex: 1;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 4px;
        }
        .thread {
          border: 1px solid var(--line);
          background: var(--panel);
          border-radius: 14px;
          padding: 10px 10px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .thread.active { border-color: var(--accent); background: rgba(22,179,179,.08); }
        .thread .t { font-size: 13px; margin: 0; }
        .thread .s { font-size: 12px; color: var(--muted); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebarFooter {
          border-top: 1px solid var(--line);
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          font-size: 12px;
        }
        .miniPill {
          border: 1px solid var(--line);
          background: var(--panel2);
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          color: var(--muted);
        }
        .backdrop {
          position: fixed; inset: 0;
          background: rgba(2, 10, 25, .2);
          opacity: 0; pointer-events: none;
          transition: .18s opacity ease;
          z-index: 50;
        }
        .backdrop.show { opacity: 1; pointer-events: auto; }
        .drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(320px, 86vw);
          background: var(--panel);
          border-right: 1px solid var(--line);
          transform: translateX(-105%);
          transition: .2s transform ease;
          z-index: 60;
          padding: 14px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .drawer.show { transform: translateX(0); }
        .drawer .closeRow { display: flex; justify-content: space-between; align-items: center; }
        .drawer .closeBtn {
          width: 36px; height: 36px; border-radius: 12px;
          border: 1px solid var(--line);
          background: var(--panel2);
          color: var(--muted);
          cursor: pointer;
          display: grid; place-items: center;
          font-size: 16px;
        }
        .main { display: flex; flex-direction: column; min-width: 0; height: 100%; min-height: 0; }
        .topbar {
          padding: 10px 12px;
          border-bottom: 1px solid var(--line);
          background: var(--panel);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .topbar .left { display: flex; gap: 10px; align-items: center; min-width: 0; }
        .hamburger {
          width: 38px; height: 38px; border-radius: 14px;
          border: 1px solid var(--line);
          background: var(--panel2);
          color: var(--muted);
          cursor: pointer;
          display: none;
          place-items: center;
          font-size: 16px;
        }
        .pill {
          border: 1px solid var(--line);
          background: var(--panel2);
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 12px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .dot { width: 8px; height: 8px; border-radius: 99px; background: var(--warn); }
        .dot.ok { background: var(--good); }
        .dot.bad { background: var(--bad); }
        .title {
          font-size: 13px; font-weight: 700;
          color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 42vw;
        }
        .titleWrap { display: flex; align-items: center; min-width: 0; }
        .titleButton {
          border: 1px solid var(--line);
          background: var(--panel2);
          color: var(--text);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          max-width: 42vw;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .titleButton:hover { border-color: var(--accent); }
        .titleText { overflow: hidden; text-overflow: ellipsis; }
        .titleIcon { font-size: 12px; opacity: .7; }
        .titleEdit { display: inline-flex; gap: 8px; align-items: center; }
        .titleInput {
          border: 1px solid var(--line);
          background: #fff;
          color: var(--text);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          outline: none;
          width: min(260px, 36vw);
        }
        .titleInput:focus { border-color: var(--accent); }
        .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
        .iconbtn {
          width: 38px; height: 38px; border-radius: 14px;
          border: 1px solid var(--line);
          background: var(--panel2);
          color: var(--muted);
          cursor: pointer;
          display: grid; place-items: center;
          font-size: 14px;
        }
        .iconbtn:hover { border-color: var(--accent); color: var(--text); }
        .navBtn {
          border: 1px solid var(--line);
          background: #fff;
          color: var(--text);
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .navBtn:hover { border-color: var(--accent); }
        .logoutBtn {
          border: 1px solid #ef4444;
          background: #fff5f5;
          color: #b91c1c;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .logoutBtn:hover { border-color: #dc2626; }
        .autoNameBtn {
          border: 1px solid var(--accent);
          background: var(--accent);
          color: #fff;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .autoNameBtn:hover { background: var(--accent-hover); }
        .select {
          border: 1px solid var(--line);
          background: var(--panel);
          color: var(--text);
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 12px;
          outline: none;
          cursor: pointer;
        }
        .search {
          border: 1px solid var(--line);
          background: var(--panel);
          color: var(--text);
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          outline: none;
          width: min(280px, 38vw);
        }
        .search:focus { border-color: var(--accent); }
        .chatWrap { flex: 1; min-height: 0; overflow-y: scroll; scroll-padding-bottom: 140px; scrollbar-gutter: stable both-edges; }
        .chat {
          width: 100%;
          margin: 0;
          padding: 18px 16px 140px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .message {
          align-self: flex-start;
          width: fit-content;
          max-width: 78%;
          border: 1px solid var(--line);
          background: var(--panel);
          border-radius: var(--radius);
          padding: 12px 12px;
          line-height: 1.55;
          position: relative;
          overflow: hidden;
        }
        .message.user {
          align-self: flex-end;
          background: #e6f2ff;
          border-color: #c6e4ff;
          text-align: right;
        }
        .message.assistant {
          align-self: flex-start;
        }
        .message .meta {
          margin-top: 10px;
          font-size: 11px;
          color: var(--muted);
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
        }
        .badge {
          font-family: var(--mono);
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: var(--panel2);
          color: var(--muted);
        }
        .tools {
          position: absolute; top: 10px; right: 10px;
          display: flex; gap: 6px;
          opacity: 0; transition: .15s opacity ease;
        }
        .message:hover .tools { opacity: 1; }
        .smallbtn {
          border: 1px solid var(--line);
          background: var(--panel2);
          color: var(--muted);
          border-radius: 10px;
          width: 30px; height: 30px;
          display: grid; place-items: center;
          cursor: pointer;
          font-size: 13px;
          user-select: none;
        }
        .smallbtn:hover { border-color: var(--accent); color: var(--text); }
        .md code.inline {
          font-family: var(--mono);
          font-size: 12px;
          padding: 1px 6px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: var(--panel2);
          color: var(--text);
        }
        pre {
          margin: 10px 0 0;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: var(--panel2);
          overflow: auto;
          font-family: var(--mono);
          font-size: 12px;
          line-height: 1.5;
          position: relative;
        }
        pre .codeTools {
          position: absolute; top: 8px; right: 8px;
          display: flex; gap: 6px;
        }
        pre .codeBtn {
          width: 28px; height: 28px; border-radius: 10px;
          border: 1px solid var(--line);
          background: var(--panel2);
          color: var(--muted);
          cursor: pointer;
          display: grid; place-items: center;
          font-size: 13px;
        }
        pre .codeBtn:hover { border-color: var(--accent); color: var(--text); }
        .hl { outline: 2px solid rgba(245,158,11,.55); outline-offset: 2px; }
        .composerBar {
          border-top: 1px solid var(--line);
          background: var(--panel);
          padding: 12px 12px 14px;
          position: sticky;
          bottom: 0;
          z-index: 10;
          flex-shrink: 0;
        }
        .composer {
          width: 100%;
          margin: 0;
          display: flex;
          gap: 10px;
          align-items: flex-end;
          padding: 0 4px;
        }
        textarea {
          flex: 1;
          resize: none;
          min-height: 48px;
          max-height: 180px;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--text);
          outline: none;
          font-size: 14px;
          line-height: 1.35;
        }
        textarea:focus { border-color: var(--accent); }
        .send {
          border: 1px solid var(--accent);
          background: var(--accent);
          color: #fff;
          font-weight: 800;
          border-radius: 14px;
          padding: 12px 14px;
          cursor: pointer;
          min-width: 90px;
        }
        .send:disabled { opacity: .55; cursor: not-allowed; }
        .composerTools {
          width: 100%;
          margin: 8px 0 0;
          padding: 0 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          font-size: 12px;
          flex-wrap: wrap;
        }
        .composerTools .leftTools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .linkBtn {
          border: 1px solid var(--line);
          background: var(--panel2);
          color: var(--muted);
          border-radius: 999px;
          padding: 6px 10px;
          cursor: pointer;
          user-select: none;
          font-size: 12px;
        }
        .linkBtn:hover { border-color: var(--accent); color: var(--text); }
        .toast {
          position: fixed; bottom: 16px; left: 50%;
          transform: translateX(-50%);
          background: #fff;
          border: 1px solid var(--line);
          padding: 10px 12px;
          border-radius: 14px;
          box-shadow: 0 12px 28px rgba(0,0,0,.12);
          opacity: 0; pointer-events: none;
          transition: .18s opacity ease, .18s transform ease;
          z-index: 80;
          font-size: 13px;
        }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(-4px); }
      
      `}</style>
    </div>
  );
}
