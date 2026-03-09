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
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
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
            <svg width="20" height="20" id="ekzyRp9EYsw1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" project-id="89ed4583d271418db6b59fea88d768f9" export-id="66544336134748449a5c7dabac83f1b4" cached="false"><defs><image id="ekzyRp9EYsw2-img" width="512" height="512" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,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"/></defs><use xlink:href="#ekzyRp9EYsw2-img"/></svg>

            {/* <svg width="17" height="17" viewBox="0 0 24 24" fill="none"> */
              
              {/* <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/> */}
            /* </button></svg> */}
          </button>
        </div>
        <p className="cw-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

export default ChatWindow;