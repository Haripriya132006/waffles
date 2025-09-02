// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

// ✅ Backend URL
const BASE_URL = "https://chatapp-yc2g.onrender.com";

// ==================== ICONS ====================
const PaperclipIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="paperclip-icon"
  >
    <path d="M21 12.5V7a5 5 0 0 0-10 0v10a3 3 0 0 0 6 0V9" />
  </svg>
);

const SmileIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-smile">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" x2="9.01" y1="9" y2="9" />
    <line x1="15" x2="15.01" y1="9" y2="9" />
  </svg>
);

const NewSendArrow = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right">
    <path d="M7 7h10v10" />
    <path d="M7 17L17 7" />
  </svg>
);

// ==================== MAIN APP ====================
export default function App() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const ws = useRef(null);
  const bottomRef = useRef();

  // Mock current user
  const currentUser = "Alice";
  const chatPartner = "Bob";

  const goBack = () => alert("Going back is not supported in this mock app.");

  // ✅ Fetch history
  useEffect(() => {
    axios.get(`${BASE_URL}/history/${currentUser}/${chatPartner}`)
      .then(res => {
        const normalized = res.data.map(msg => ({
          ...msg,
          from: msg.from || msg.from_user,
          to: msg.to || msg.to_user,
        }));
        const sorted = normalized.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        setMessages(sorted);
      });
  }, [chatPartner, currentUser]);

  // ✅ WebSocket setup
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

  // ✅ Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Send message
  const sendMessage = () => {
    if (!text.trim()) return;

    const messageData = {
      from: currentUser,
      to: chatPartner,
      text: text.trim(),
    };

    ws.current.send(JSON.stringify(messageData));
    setText("");
  };

  return (
    <>
      <style>
        {`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-200 to-blue-200 font-inter p-4 sm:p-8">
        <div
          className="relative w-full max-w-2xl h-[90vh] flex flex-col rounded-[3rem] overflow-hidden
                     bg-white/30 backdrop-blur-2xl"
          style={{ boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.4)" }}
        >
          {/* Header */}
          <div className="flex items-center p-8 pb-4">
            <button
              onClick={goBack}
              className="text-gray-600 hover:text-gray-900 transition-colors mr-4 focus:outline-none"
            >
              ↶ Back
            </button>
            <h1 className="text-xl font-semibold text-gray-800">
              <strong className="font-bold">🗯️{chatPartner}</strong>
            </h1>
          </div>

          {/* Messages */}
          <div className="flex-1 p-8 pt-0 space-y-4 overflow-y-auto no-scrollbar">
            {messages.map((msg, index) => {
              const alignRight = msg.from === currentUser;
              return (
                <div key={msg._id || index} className={`flex ${alignRight ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`p-4 rounded-[2rem] text-gray-800 whitespace-pre-wrap break-words max-w-[75%]
                                ${alignRight ? "bg-purple-300/50" : "bg-white/70"} backdrop-blur-sm`}
                    style={{ boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.6)" }}
                  >
                    <div className="text-left font-bold mb-1 text-xs">{msg.from}</div>
                    <div className="text-left whitespace-pre-wrap break-words leading-relaxed">{msg.text}</div>
                    <div className="text-xs text-gray-600 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex p-8 pt-4"
          >
            <div
              className="relative flex-1 rounded-[2rem] bg-white/70 backdrop-blur-lg"
              style={{ boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.6)" }}
            >
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="w-full p-4 pl-14 pr-14 rounded-[2rem] bg-transparent text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-blue-300/50"
              />
              <button
                type="button"
                className="absolute inset-y-0 left-0 flex items-center pl-4 pr-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <PaperclipIcon />
              </button>
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <SmileIcon />
              </button>
            </div>
            <button
              type="submit"
              onClick={sendMessage}
              className="ml-4 w-12 h-12 flex items-center justify-center rounded-full bg-[#5865F2] text-white transition-all
                         hover:bg-[#4752c4] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#5865F2]/50"
            >
              <NewSendArrow className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
