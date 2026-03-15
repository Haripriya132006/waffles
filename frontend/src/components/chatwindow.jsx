// src/components/ChatWindow.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import "./ChatWindow.css";
import SendIcon from '../assets/send-icon.svg';

const BASE_URL = "https://chatapp-yc2g.onrender.com";

function Avatar({ name, size = 32 }) {
  const colors = ["#5b7cff","#3ecf8e","#ff7c5b","#c97bff","#ffb347","#5bc8ff"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: color + "22", color,
      borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 600,
      border: `1.5px solid ${color}44`,
    }}>
      {name[0].toUpperCase()}
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncate(text, max = 60) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// ── Voice player ──
function VoicePlayer({ url }) {
  const audioRef = useRef(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { audioRef.current.play();  setPlaying(true);  }
  };

  const bars = [3,5,8,4,9,6,11,8,5,10,7,4,9,6,3,8,5,10,7,4];

  return (
    <div className="cw-voice" onClick={e => e.stopPropagation()}>
      <audio ref={audioRef} src={url}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onTimeUpdate={e => setProgress(e.target.currentTime / (e.target.duration || 1))}
        onEnded={() => { setPlaying(false); setProgress(0); if (audioRef.current) audioRef.current.currentTime = 0; }}
      />
      <button className="cw-voice__play" onClick={toggle}>
        {playing
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="4" width="4" height="16" rx="2"/>
              <rect x="15" y="4" width="4" height="16" rx="2"/>
            </svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4.5C7 3.4 8.2 2.7 9.2 3.3L19.7 9.8C20.6 10.4 20.6 11.6 19.7 12.2L9.2 18.7C8.2 19.3 7 18.6 7 17.5V4.5Z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
        }
      </button>
      <div className="cw-voice__bars">
        {bars.map((h, i) => {
          const pos  = i / bars.length;
          const diff = pos - progress;
          const opacity = diff < 0 ? 1 : diff < 0.15 ? 1 - (diff / 0.15) * 0.65 : 0.35;
          return <div key={i} className="cw-voice__bar-seg" style={{ height: `${h}px`, opacity }} />;
        })}
      </div>
      <span className="cw-voice__time">{formatDuration(Math.round(duration))}</span>
    </div>
  );
}

// ── Image bubble ──
function ImageBubble({ attachment }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img src={attachment.url} alt={attachment.name} className="cw-img-bubble"
        onClick={e => { e.stopPropagation(); setOpen(true); }} />
      {open && (
        <div className="cw-lightbox" onClick={() => setOpen(false)}>
          <img src={attachment.url} alt={attachment.name} />
        </div>
      )}
    </>
  );
}

// ── Document bubble ──
function DocBubble({ attachment }) {
  return (
    <a href={attachment.url} target="_blank" rel="noreferrer"
      className="cw-doc-bubble" onClick={e => e.stopPropagation()}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="cw-doc-bubble__info">
        <span className="cw-doc-bubble__name">{truncate(attachment.name, 30)}</span>
        <span className="cw-doc-bubble__size">{formatSize(attachment.size)}</span>
      </div>
    </a>
  );
}

// ── Attachment preview before sending ──
function AttachPreview({ file, onRemove }) {
  const isImage = file.type.startsWith("image/");
  const [url] = useState(() => URL.createObjectURL(file));
  return (
    <div className="cw-attach-preview">
      {isImage
        ? <img src={url} alt={file.name} className="cw-attach-preview__img" />
        : <div className="cw-attach-preview__doc">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{truncate(file.name, 20)}</span>
          </div>
      }
      <button className="cw-attach-preview__remove" onClick={onRemove}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Context Menu ──
function ContextMenu({ x, y, msg, isSelf, onReply, onEdit, onDelete, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth  - 168);
  const adjustedY = Math.min(y, window.innerHeight - 150);

  return (
    <div ref={ref} className="cw-context-menu" style={{ top: adjustedY, left: adjustedX }}>
      {!msg.deleted && (
        <button className="cw-context-menu__item" onClick={() => { onReply(); onClose(); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <polyline points="9 17 4 12 9 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Reply
        </button>
      )}
      {isSelf && !msg.deleted && !msg.attachment && (
        <button className="cw-context-menu__item" onClick={() => { onEdit(); onClose(); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Edit
        </button>
      )}
      {isSelf && (
        <button className="cw-context-menu__item cw-context-menu__item--danger" onClick={() => { onDelete(); onClose(); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Delete
        </button>
      )}
    </div>
  );
}

// ── Confirm Dialog ──
function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="cw-confirm-overlay" onClick={onCancel}>
      <div className="cw-confirm-box" onClick={e => e.stopPropagation()}>
        <h3>Delete message?</h3>
        <p>This will delete the message for everyone in this chat.</p>
        <div className="cw-confirm-actions">
          <button className="cw-confirm-cancel" onClick={onCancel}>Cancel</button>
          <button className="cw-confirm-delete" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
function ChatWindow({ currentUser, chatPartner, goBack }) {
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState("");
  const [replyTo, setReplyTo]             = useState(null);
  const [editingMsg, setEditingMsg]       = useState(null);
  const [contextMenu, setContextMenu]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pendingFile, setPendingFile]     = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [recording, setRecording]         = useState(false);
  const [recSeconds, setRecSeconds]       = useState(0);

  const ws            = useRef(null);
  const bottomRef     = useRef();
  const inputRef      = useRef();
  const fileInputRef  = useRef();
  const mediaRecorder = useRef(null);
  const audioChunks   = useRef([]);
  const recTimer      = useRef(null);
  const lastTap       = useRef({ id: null, time: 0 });
  const tapTimer      = useRef(null);

  useEffect(() => {
    axios.get(`${BASE_URL}/history/${currentUser}/${chatPartner}`)
      .then(res => {
        const normalized = res.data.map(msg => ({
          ...msg, from: msg.from || msg.from_user, to: msg.to || msg.to_user,
        }));
        setMessages(normalized.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      });
  }, [chatPartner, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ws.current = new WebSocket(`wss://chatapp-yc2g.onrender.com/wss/${currentUser}`);
    ws.current.onmessage = event => {
      const raw = JSON.parse(event.data);
      console.log("WS RAW:", raw);

      if (raw.type === "edit") {
        setMessages(prev => prev.map(m => m._id === raw._id ? { ...m, text: raw.text, edited: true } : m));
        return;
      }
      if (raw.type === "delete") {
        setMessages(prev => prev.map(m =>
          m._id === raw._id ? { ...m, deleted_for: ["everyone"] } : m
        ));
        return;
      }

      const message = {
        from: raw.from || raw.from_user, to: raw.to || raw.to_user,
        text: raw.text, timestamp: raw.timestamp, _id: raw._id,
        reply_to: raw.reply_to || null, attachment: raw.attachment || null,
        edited: raw.edited || false, deleted_for: raw.deleted_for || [],
      };
      if ([message.from, message.to].includes(chatPartner)) {
        setMessages(prev => {
          if (prev.find(m => m._id && m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    };
    ws.current.onclose = () => console.log("WS closed");
    ws.current.onerror = err => console.error("WS error:", err);
    return () => ws.current?.close();
  }, [currentUser, chatPartner]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (replyTo || editingMsg) inputRef.current?.focus(); }, [replyTo, editingMsg]);
  useEffect(() => {
    const el = document.querySelector(".cw-messages");
    const close = () => setContextMenu(null);
    el?.addEventListener("scroll", close);
    return () => el?.removeEventListener("scroll", close);
  }, []);

  const uploadFile = async (file, kind) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    form.append("from_user", currentUser);
    const res = await axios.post(`${BASE_URL}/upload`, form);
    return res.data;
  };

  const sendMessage = async () => {
    if (editingMsg) {
      if (!text.trim()) return;
      ws.current.send(JSON.stringify({ type: "edit", _id: editingMsg._id, text: text.trim(), from: currentUser, to: chatPartner }));
      setMessages(prev => prev.map(m => m._id === editingMsg._id ? { ...m, text: text.trim(), edited: true } : m));
      setEditingMsg(null); setText(""); return;
    }
    if (!text.trim() && !pendingFile) return;
    let attachment = null;
    if (pendingFile) {
      setUploading(true);
      const kind = pendingFile.type.startsWith("image/") ? "image" : "document";
      attachment = await uploadFile(pendingFile, kind);
      setPendingFile(null); setUploading(false);
    }
    ws.current.send(JSON.stringify({
      from: currentUser, to: chatPartner, text: text.trim(),
      reply_to: replyTo || undefined, attachment: attachment || undefined,
    }));
    setText(""); setReplyTo(null);
    inputRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunks.current = [];
      mr.ondataavailable = e => audioChunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        setUploading(true);
        const attachment = await uploadFile(file, "voice");
        setUploading(false);
        ws.current.send(JSON.stringify({ from: currentUser, to: chatPartner, text: "", reply_to: replyTo || undefined, attachment }));
        setReplyTo(null); setRecSeconds(0);
      };
      mr.start();
      mediaRecorder.current = mr;
      setRecording(true); setRecSeconds(0);
      recTimer.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => { clearInterval(recTimer.current); mediaRecorder.current?.stop(); setRecording(false); };

  const cancelRecording = () => {
    clearInterval(recTimer.current);
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.ondataavailable = null;
      mediaRecorder.current.onstop = null;
      mediaRecorder.current.stop();
      mediaRecorder.current.stream?.getTracks().forEach(t => t.stop());
    }
    audioChunks.current = [];
    setRecording(false); setRecSeconds(0);
  };

  const handleDelete = msg => setConfirmDelete(msg);
  const confirmDeleteMsg = () => {
    const msg = confirmDelete;
    ws.current.send(JSON.stringify({ type: "delete", _id: msg._id, from: currentUser, to: chatPartner }));
    setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, deleted_for: ["everyone"] } : m));
    setConfirmDelete(null);
  };
  const handleEdit = msg => { setEditingMsg(msg); setText(msg.text); setReplyTo(null); };
  const cancelEdit = () => { setEditingMsg(null); setText(""); };

  const handleBubbleClick = useCallback((e, msg) => {
    if (msg.isDeletedForMe) return;
    e.stopPropagation();
    const now = Date.now();
    if (lastTap.current.id === msg._id && now - lastTap.current.time < 350) {
      clearTimeout(tapTimer.current);
      setReplyTo({ message_id: msg._id, from_user: msg.from, text: msg.text });
      lastTap.current = { id: null, time: 0 };
    } else {
      lastTap.current = { id: msg._id, time: now };
      clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => setContextMenu({ x: e.clientX, y: e.clientY, msg }), 350);
    }
  }, []);

  const grouped = messages.map((msg, i) => ({
    ...msg,
    isSelf:         msg.from === currentUser,
    isFirst:        i === 0 || messages[i - 1].from !== msg.from,
    isLast:         i === messages.length - 1 || messages[i + 1].from !== msg.from,
    isDeletedForMe: (msg.deleted_for || []).includes("everyone") || (msg.deleted_for || []).includes(currentUser),
  }));

  const canSend = (text.trim() || pendingFile) && !uploading;

  return (
    <div className="cw-shell" onClick={() => setContextMenu(null)}>
      <header className="cw-header">
        <button className="cw-back" onClick={goBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <Avatar name={chatPartner} size={36} />
        <div className="cw-header__info">
          <span className="cw-header__name">{chatPartner}</span>
          <span className="cw-header__status"><span className="cw-status-dot" /> Online</span>
        </div>
      </header>

      <div className="cw-messages">
        {grouped.length === 0 && (
          <div className="cw-empty">
            <Avatar name={chatPartner} size={52} />
            <p>{chatPartner}</p>
            <span>Start the conversation!</span>
          </div>
        )}
        {grouped.map((msg, i) => (
          <div key={msg._id || i} className={`cw-row ${msg.isSelf ? "cw-row--self" : "cw-row--other"}`}>
            {!msg.isSelf && (
              msg.isFirst
                ? <div className="cw-row__avatar"><Avatar name={msg.from} size={26} /></div>
                : <div className="cw-row__avatar-gap" />
            )}
            {!msg.isDeletedForMe && (
              <button className="cw-reply-btn"
                onClick={e => { e.stopPropagation(); setReplyTo({ message_id: msg._id, from_user: msg.from, text: msg.text }); }}
                aria-label="Reply"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <polyline points="9 17 4 12 9 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <div className="cw-col">
              <div
                className={[
                  "cw-bubble",
                  msg.isSelf ? "cw-bubble--self" : "cw-bubble--other",
                  msg.isFirst ? "is-first" : "",
                  msg.isLast  ? "is-last"  : "",
                  msg.isDeletedForMe ? "cw-bubble--deleted" : "",
                  msg.attachment?.kind === "voice" ? "cw-bubble--voice" : "",
                ].join(" ")}
                onClick={e => handleBubbleClick(e, msg)}
              >
                {msg.isDeletedForMe ? <span>🚫 This message was deleted</span> : (
                  <>
                    {msg.reply_to && (
                      <div className="cw-quote">
                        <span className="cw-quote__name">{msg.reply_to.from_user}</span>
                        <span className="cw-quote__text">{truncate(msg.reply_to.text)}</span>
                      </div>
                    )}
                    {msg.attachment && (
                      msg.attachment.kind === "voice"    ? <VoicePlayer url={msg.attachment.url} /> :
                      msg.attachment.kind === "image"    ? <ImageBubble attachment={msg.attachment} /> :
                      msg.attachment.kind === "document" ? <DocBubble   attachment={msg.attachment} /> : null
                    )}
                    {msg.text && <span>{msg.text}</span>}
                  </>
                )}
              </div>
              {msg.isLast && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="cw-time">{formatTime(msg.timestamp)}</span>
                  {msg.edited && !msg.isDeletedForMe && <span className="cw-edited-label">edited</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y} msg={contextMenu.msg}
          isSelf={contextMenu.msg.from === currentUser}
          onReply={() => setReplyTo({ message_id: contextMenu.msg._id, from_user: contextMenu.msg.from, text: contextMenu.msg.text })}
          onEdit={() => handleEdit(contextMenu.msg)}
          onDelete={() => handleDelete(contextMenu.msg)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {confirmDelete && <ConfirmDialog onConfirm={confirmDeleteMsg} onCancel={() => setConfirmDelete(null)} />}

      {editingMsg && (
        <div className="cw-reply-banner">
          <div className="cw-reply-banner__bar" style={{ background: "var(--online)" }} />
          <div className="cw-reply-banner__body">
            <span className="cw-reply-banner__name">Editing message</span>
            <span className="cw-reply-banner__text">{truncate(editingMsg.text)}</span>
          </div>
          <button className="cw-reply-banner__close" onClick={cancelEdit}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {replyTo && !editingMsg && (
        <div className="cw-reply-banner">
          <div className="cw-reply-banner__bar" />
          <div className="cw-reply-banner__body">
            <span className="cw-reply-banner__name">Replying to <strong>{replyTo.from_user}</strong></span>
            <span className="cw-reply-banner__text">{truncate(replyTo.text)}</span>
          </div>
          <button className="cw-reply-banner__close" onClick={() => setReplyTo(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {pendingFile && (
        <div className="cw-reply-banner" style={{ gap: 12 }}>
          <AttachPreview file={pendingFile} onRemove={() => setPendingFile(null)} />
          <div className="cw-reply-banner__body">
            <span className="cw-reply-banner__name">{truncate(pendingFile.name, 30)}</span>
            <span className="cw-reply-banner__text">{formatSize(pendingFile.size)}</span>
          </div>
        </div>
      )}

      <div className="cw-input-area">
        {recording ? (
          <div className="cw-recording">
            <span className="cw-recording__dot" />
            <span className="cw-recording__time">{formatDuration(recSeconds)}</span>
            <span className="cw-recording__label">Recording…</span>
            <button className="cw-recording__cancel" onClick={cancelRecording} title="Cancel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="cw-send cw-send--active" onClick={stopRecording} title="Send voice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          </div>
        ) : (
          <div className="cw-input-wrap">
            <input ref={fileInputRef} type="file"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files[0]) setPendingFile(e.target.files[0]); e.target.value = ""; }}
            />
            <button className="cw-icon-btn" onClick={() => fileInputRef.current.click()} title="Attach file">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <textarea ref={inputRef} className="cw-textarea" rows={1}
              placeholder={editingMsg ? "Edit message…" : `Message ${chatPartner}…`}
              value={text}
              onChange={e => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                if (e.key === "Escape" && editingMsg) cancelEdit();
              }}
            />
            {!text.trim() && !pendingFile && !editingMsg ? (
              <button className="cw-icon-btn cw-icon-btn--mic" onClick={startRecording} title="Voice message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            ) : (
              <button className={`cw-send ${canSend ? "cw-send--active" : ""}`}
                onClick={sendMessage} disabled={!canSend} aria-label="Send">
                {uploading
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="cw-spin">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
                        strokeDasharray="32" strokeDashoffset="10" strokeLinecap="round"/>
                    </svg>
                  : <img src={SendIcon} alt="Send" width="20" height="20"
                      style={{ filter: "brightness(0) saturate(100%) invert(87%) sepia(20%) saturate(400%) hue-rotate(233deg) brightness(103%)" }}
                    />
                }
              </button>
            )}
          </div>
        )}
        <p className="cw-hint">Enter to send · Shift+Enter for newline · Click bubble for options</p>
      </div>
    </div>
  );
}

export default ChatWindow;