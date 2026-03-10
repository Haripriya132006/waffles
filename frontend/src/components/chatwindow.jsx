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
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function truncate(text, max = 60) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function ChatWindow({ currentUser, chatPartner, goBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { message_id, from_user, text }
  const ws = useRef(null);
  const bottomRef = useRef();
  const inputRef = useRef();
  const lastTap = useRef({ id: null, time: 0 }); // double-tap tracking

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
      const message = {
        from: raw.from || raw.from_user,
        to: raw.to || raw.to_user,
        text: raw.text,
        timestamp: raw.timestamp,
        _id: raw._id,
        reply_to: raw.reply_to || null,
      };
      if ([message.from, message.to].includes(chatPartner)) {
        setMessages(prev => [...prev, message]);
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
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const sendMessage = () => {
    if (!text.trim()) return;
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

  // Desktop: double-click
  const handleDoubleClick = useCallback((msg) => {
    setReplyTo({ message_id: msg._id, from_user: msg.from, text: msg.text });
  }, []);

  // Mobile: double-tap (within 350ms)
  const handleTouchEnd = useCallback((msg) => {
    const now = Date.now();
    if (lastTap.current.id === msg._id && now - lastTap.current.time < 350) {
      setReplyTo({ message_id: msg._id, from_user: msg.from, text: msg.text });
      lastTap.current = { id: null, time: 0 };
    } else {
      lastTap.current = { id: msg._id, time: now };
    }
  }, []);

  const cancelReply = () => setReplyTo(null);

  const grouped = messages.map((msg, i) => ({
    ...msg,
    isSelf: msg.from === currentUser,
    isFirst: i === 0 || messages[i - 1].from !== msg.from,
    isLast:  i === messages.length - 1 || messages[i + 1].from !== msg.from,
  }));

  return (
    <div className="cw-shell">
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
            onDoubleClick={() => handleDoubleClick(msg)}
            onTouchEnd={() => handleTouchEnd(msg)}
          >
            {!msg.isSelf && (
              msg.isFirst
                ? <div className="cw-row__avatar"><Avatar name={msg.from} size={26} /></div>
                : <div className="cw-row__avatar-gap" />
            )}

            {/* Reply icon — desktop hover only */}
            <button
              className="cw-reply-btn"
              onClick={() => handleDoubleClick(msg)}
              aria-label="Reply"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline points="9 17 4 12 9 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="cw-col">
              <div className={[
                "cw-bubble",
                msg.isSelf ? "cw-bubble--self" : "cw-bubble--other",
                msg.isFirst ? "is-first" : "",
                msg.isLast  ? "is-last"  : "",
                msg.reply_to ? "has-reply" : "",
              ].join(" ")}>
                {/* Reply quote inside bubble */}
                {msg.reply_to && (
                  <div className="cw-quote">
                    <span className="cw-quote__name">{msg.reply_to.from_user}</span>
                    <span className="cw-quote__text">{truncate(msg.reply_to.text)}</span>
                  </div>
                )}
                {msg.text}
              </div>
              {msg.isLast && (
                <span className="cw-time">{formatTime(msg.timestamp)}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply banner above input */}
      {replyTo && (
        <div className="cw-reply-banner">
          <div className="cw-reply-banner__bar" />
          <div className="cw-reply-banner__body">
            <span className="cw-reply-banner__name">Replying to <strong>{replyTo.from_user}</strong></span>
            <span className="cw-reply-banner__text">{truncate(replyTo.text)}</span>
          </div>
          <button className="cw-reply-banner__close" onClick={cancelReply} aria-label="Cancel reply">
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
            placeholder={`Message ${chatPartner}…`}
            value={text}
            onChange={e => {
                setText(e.target.value); 
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }
            }
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
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
        <p className="cw-hint">Enter to send · Shift+Enter for new line · Double-tap to reply</p>
      </div>
    </div>
  );
}

export default ChatWindow;