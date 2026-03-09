// src/components/ChatWindow.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./ChatWindow.css";

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
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatWindow({ currentUser, chatPartner, goBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const ws = useRef(null);
  const bottomRef = useRef();
  const inputRef = useRef();

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
  }, [chatPartner, currentUser]);

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
      };
      if ([message.from, message.to].includes(chatPartner)) {
        setMessages(prev => [...prev, message]);
      }
    };
    ws.current.onclose = () => console.log("WebSocket closed");
    ws.current.onerror = err => console.error("WebSocket error:", err);
    return () => ws.current?.close();
  }, [currentUser, chatPartner]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim()) return;
    ws.current.send(JSON.stringify({ from: currentUser, to: chatPartner, text: text.trim() }));
    setText("");
    inputRef.current?.focus();
  };

  // Group consecutive messages by sender
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
          <div key={msg._id || i} className={`cw-row ${msg.isSelf ? "cw-row--self" : "cw-row--other"}`}>
            {!msg.isSelf && (
              msg.isFirst
                ? <div className="cw-row__avatar"><Avatar name={msg.from} size={26} /></div>
                : <div className="cw-row__avatar-gap" />
            )}
            <div className="cw-col">
              <div className={[
                "cw-bubble",
                msg.isSelf ? "cw-bubble--self" : "cw-bubble--other",
                msg.isFirst ? "is-first" : "",
                msg.isLast  ? "is-last"  : "",
              ].join(" ")}>
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

      {/* Input */}
      <div className="cw-input-area">
        <div className="cw-input-wrap">
          <textarea
            ref={inputRef}
            className="cw-textarea"
            rows={1}
            placeholder={`Message ${chatPartner}…`}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button
            className={`cw-send ${text.trim() ? "cw-send--active" : ""}`}
            onClick={sendMessage}
            disabled={!text.trim()}
            aria-label="Send"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
        </div>
        <p className="cw-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

export default ChatWindow;