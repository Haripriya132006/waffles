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

function truncate(text, max = 60) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// ── Context Menu ──
function ContextMenu({ x, y, msg, isSelf, onReply, onEdit, onDelete, onClose }) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  const menuWidth = 160;
  const menuHeight = isSelf ? 130 : 52;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

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
      {isSelf && !msg.deleted && (
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
        <p>This will remove the message from your view. The other person may still see it.</p>
        <div className="cw-confirm-actions">
          <button className="cw-confirm-cancel" onClick={onCancel}>Cancel</button>
          <button className="cw-confirm-delete" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function ChatWindow({ currentUser, chatPartner, goBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const ws = useRef(null);
  const bottomRef = useRef();
  const inputRef = useRef();
  const lastTap = useRef({ id: null, time: 0 });
  const tapTimer = useRef(null);

  useEffect(() => {
    axios.get(`${BASE_URL}/history/${currentUser}/${chatPartner}`)
      .then(res => {
        const normalized = res.data.map(msg => ({
          ...msg,
          from: msg.from || msg.from_user,
          to: msg.to || msg.to_user,
        }));
        setMessages(normalized.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      });
  }, [chatPartner, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ws.current = new WebSocket(`wss://chatapp-yc2g.onrender.com/wss/${currentUser}`);
    ws.current.onmessage = event => {
      const raw = JSON.parse(event.data);

      if (raw.type === "edit") {
        setMessages(prev => prev.map(m =>
          m._id === raw._id ? { ...m, text: raw.text, edited: true } : m
        ));
        return;
      }

      if (raw.type === "delete") {
        setMessages(prev => prev.map(m =>
          m._id === raw._id ? { ...m, deleted_for: [...(m.deleted_for || []), raw.deleted_for] } : m
        ));
        return;
      }

      const message = {
        from: raw.from || raw.from_user,
        to: raw.to || raw.to_user,
        text: raw.text,
        timestamp: raw.timestamp,
        _id: raw._id,
        reply_to: raw.reply_to || null,
        edited: raw.edited || false,
        deleted_for: raw.deleted_for || [],
      };
      if ([message.from, message.to].includes(chatPartner)) {
        setMessages(prev => {
          if (prev.find(m => m._id && m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    };
    ws.current.onclose = () => console.log("WebSocket closed");
    ws.current.onerror = err => console.error("WebSocket error:", err);
    return () => ws.current?.close();
  }, [currentUser, chatPartner]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (replyTo || editingMsg) inputRef.current?.focus();
  }, [replyTo, editingMsg]);

  useEffect(() => {
    const el = document.querySelector(".cw-messages");
    const close = () => setContextMenu(null);
    el?.addEventListener("scroll", close);
    return () => el?.removeEventListener("scroll", close);
  }, []);

  const sendMessage = () => {
    if (!text.trim()) return;

    if (editingMsg) {
      ws.current.send(JSON.stringify({
        type: "edit",
        _id: editingMsg._id,
        text: text.trim(),
        from: currentUser,
        to: chatPartner,
      }));
      setMessages(prev => prev.map(m =>
        m._id === editingMsg._id ? { ...m, text: text.trim(), edited: true } : m
      ));
      setEditingMsg(null);
      setText("");
      return;
    }

    ws.current.send(JSON.stringify({
      from: currentUser,
      to: chatPartner,
      text: text.trim(),
      reply_to: replyTo || undefined,
    }));
    setText("");
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleDelete = (msg) => setConfirmDelete(msg);

  const confirmDeleteMsg = () => {
    const msg = confirmDelete;
    ws.current.send(JSON.stringify({
      type: "delete",
      _id: msg._id,
      from: currentUser,
      to: chatPartner,
    }));
    setMessages(prev => prev.map(m =>
      m._id === msg._id ? { ...m, deleted_for: [...(m.deleted_for || []), currentUser] } : m
    ));
    setConfirmDelete(null);
  };

  const handleEdit = (msg) => {
    setEditingMsg(msg);
    setText(msg.text);
    setReplyTo(null);
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setText("");
  };

  // Single click/tap → context menu (after 350ms wait)
  // Double click/tap → reply directly
  // Uses onClick only — works on both desktop and mobile (no onTouchEnd conflict)
  const handleBubbleClick = useCallback((e, msg) => {
    if (msg.isDeletedForMe) return;
    e.stopPropagation();

    const now = Date.now();

    if (lastTap.current.id === msg._id && now - lastTap.current.time < 350) {
      // double → reply directly
      clearTimeout(tapTimer.current);
      setReplyTo({ message_id: msg._id, from_user: msg.from, text: msg.text });
      lastTap.current = { id: null, time: 0 };
    } else {
      // potential single — wait to confirm no second tap
      lastTap.current = { id: msg._id, time: now };
      clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        setContextMenu({ x: e.clientX, y: e.clientY, msg });
      }, 350);
    }
  }, []);

  const grouped = messages.map((msg, i) => ({
    ...msg,
    isSelf: msg.from === currentUser,
    isFirst: i === 0 || messages[i - 1].from !== msg.from,
    isLast:  i === messages.length - 1 || messages[i + 1].from !== msg.from,
    isDeletedForMe: (msg.deleted_for || []).includes(currentUser),
  }));

  return (
    <div className="cw-shell" onClick={() => setContextMenu(null)}>
      {/* Header */}
      <header className="cw-header">
        <button className="cw-back" onClick={goBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <Avatar name={chatPartner} size={36} />
        <div className="cw-header__info">
          <span className="cw-header__name">{chatPartner}</span>
          <span className="cw-header__status">
            <span className="cw-status-dot" /> Online
          </span>
        </div>
      </header>

      {/* Messages */}
      <div className="cw-messages">
        {grouped.length === 0 && (
          <div className="cw-empty">
            <Avatar name={chatPartner} size={52} />
            <p>{chatPartner}</p>
            <span>Start the conversation!</span>
          </div>
        )}

        {grouped.map((msg, i) => (
          <div
            key={msg._id || i}
            className={`cw-row ${msg.isSelf ? "cw-row--self" : "cw-row--other"}`}
          >
            {!msg.isSelf && (
              msg.isFirst
                ? <div className="cw-row__avatar"><Avatar name={msg.from} size={26} /></div>
                : <div className="cw-row__avatar-gap" />
            )}

            {/* Reply icon — desktop hover only */}
            {!msg.isDeletedForMe && (
              <button
                className="cw-reply-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyTo({ message_id: msg._id, from_user: msg.from, text: msg.text });
                }}
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
                ].join(" ")}
                onClick={(e) => handleBubbleClick(e, msg)}
              >
                {msg.isDeletedForMe ? (
                  <span>🚫 You deleted this message</span>
                ) : (
                  <>
                    {msg.reply_to && (
                      <div className="cw-quote">
                        <span className="cw-quote__name">{msg.reply_to.from_user}</span>
                        <span className="cw-quote__text">{truncate(msg.reply_to.text)}</span>
                      </div>
                    )}
                    {msg.text}
                  </>
                )}
              </div>
              {msg.isLast && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="cw-time">{formatTime(msg.timestamp)}</span>
                  {msg.edited && !msg.isDeletedForMe && (
                    <span className="cw-edited-label">edited</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          msg={contextMenu.msg}
          isSelf={contextMenu.msg.from === currentUser}
          onReply={() => setReplyTo({ message_id: contextMenu.msg._id, from_user: contextMenu.msg.from, text: contextMenu.msg.text })}
          onEdit={() => handleEdit(contextMenu.msg)}
          onDelete={() => handleDelete(contextMenu.msg)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <ConfirmDialog
          onConfirm={confirmDeleteMsg}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Edit banner */}
      {editingMsg && (
        <div className="cw-reply-banner">
          <div className="cw-reply-banner__bar" style={{ background: "var(--online)" }} />
          <div className="cw-reply-banner__body">
            <span className="cw-reply-banner__name">Editing message</span>
            <span className="cw-reply-banner__text">{truncate(editingMsg.text)}</span>
          </div>
          <button className="cw-reply-banner__close" onClick={cancelEdit} aria-label="Cancel edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Reply banner */}
      {replyTo && !editingMsg && (
        <div className="cw-reply-banner">
          <div className="cw-reply-banner__bar" />
          <div className="cw-reply-banner__body">
            <span className="cw-reply-banner__name">Replying to <strong>{replyTo.from_user}</strong></span>
            <span className="cw-reply-banner__text">{truncate(replyTo.text)}</span>
          </div>
          <button className="cw-reply-banner__close" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="cw-input-area">
        <div className="cw-input-wrap">
          <textarea
            ref={inputRef}
            className="cw-textarea"
            rows={1}
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
          <button
            className={`cw-send ${text.trim() ? "cw-send--active" : ""}`}
            onClick={sendMessage}
            disabled={!text.trim()}
            aria-label="Send"
          >
            <img
              src={SendIcon}
              alt="Send"
              width="20"
              height="20"
              style={{ filter: "brightness(0) saturate(100%) invert(87%) sepia(20%) saturate(400%) hue-rotate(233deg) brightness(103%)" }}
            />
          </button>
        </div>
        <p className="cw-hint">Enter to send · Shift+Enter for new line · Click bubble for options</p>
      </div>
    </div>
  );
}

export default ChatWindow;