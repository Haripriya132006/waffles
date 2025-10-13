import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const BASE_URL = "https://chatapp-yc2g.onrender.com";

// --- UI Components and Icons (Self-Contained SVGs) ---

const BackArrow = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <line x1="5" y1="12" x2="19" y2="12" />
        <line x1="5" y1="12" x2="11" y2="18" />
        <line x1="5" y1="12" x2="11" y2="6" />
    </svg>
);

const PaperclipIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M15 4l-6 6a4.5 4.5 0 0 0 6 6l6 -6a4.5 4.5 0 0 0 -6 -6l-6 6a4.5 4.5 0 0 0 6 6l6 -6" transform="translate(-1.5 2.5) rotate(45 12 12)" />
  </svg>
);

const SmileIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0m0 0" fill="none"/>
    <circle cx="12" cy="12" r="9" />
    <line x1="9" y1="10" x2="9.01" y2="10" />
    <line x1="15" y1="10" x2="15.01" y2="10" />
    <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
  </svg>
);

const NewSendArrow = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-45" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <line x1="10" y1="14" x2="21" y2="3" />
      <path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
    </svg>
);

// --- ChatWindow Component (Styled with Glassmorphism) ---

function ChatWindow({ currentUser, chatPartner, goBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const ws = useRef(null);
  const bottomRef = useRef();

  // Fetch message history when chatPartner changes
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
      })
      .catch(err => console.error("Error fetching history:", err));
  }, [chatPartner, currentUser]);

  // Create WebSocket once per currentUser
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

      // Only add message if it involves current chatPartner
      if ([message.from, message.to].includes(chatPartner)) {
        setMessages(prev => [...prev, message]);
      }
    };

    ws.current.onclose = () => console.log("WebSocket closed");
    ws.current.onerror = err => console.error("WebSocket error:", err);

    return () => {
      ws.current?.close();
    };
  }, [currentUser, chatPartner]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const MessageBubble = ({ msg, alignRight }) => {
    const timeString = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const bubbleColor = alignRight ? 'bg-indigo-300/60' : 'bg-white/70';
    const textColor = alignRight ? 'text-white' : 'text-gray-800';
    const timeColor = alignRight ? 'text-indigo-100/80' : 'text-gray-500';
    const borderRadius = alignRight ? 'rounded-tl-xl rounded-bl-xl rounded-tr-sm rounded-br-xl' : 'rounded-tr-xl rounded-br-xl rounded-tl-sm rounded-bl-xl';
    const alignment = alignRight ? 'ml-auto' : 'mr-auto';

    return (
      <div className={`flex w-full ${alignRight ? 'justify-end' : 'justify-start'} break-words mb-3`}>
        <div
          className={`${bubbleColor} ${textColor} ${borderRadius} ${alignment} p-3 max-w-[80%] backdrop-blur-sm`}
          style={{ 
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            minHeight: '40px',
            wordBreak: 'break-word', 
            overflowWrap: 'break-word',
          }}
        >
          <div className="font-semibold text-xs mb-1">
            {msg.from}
          </div>
          <div className="text-sm whitespace-pre-wrap">
            {msg.text}
          </div>
          <div className={`text-right text-xs mt-1 ${timeColor}`}>
            {timeString}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="flex items-center p-6 bg-white/50 backdrop-blur-sm border-b border-indigo-200/50">
          <button
            onClick={goBack}
            className="p-2 rounded-full text-gray-700 hover:bg-white/80 transition-colors mr-4"
          >
            <BackArrow />
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            Chatting with <strong className="text-indigo-600">{chatPartner}</strong>
          </h2>
        </div>

        {/* Message Log Area */}
        <div
          className="flex-1 p-6 space-y-3 overflow-y-scroll"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar
        >
          {messages.map((msg, index) => (
            <MessageBubble key={msg._id || index} msg={msg} alignRight={msg.from === currentUser} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Message Input Area */}
        <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-indigo-200/50">
          <div className="flex items-center space-x-2">
            {/* Attach File Button */}
            <button
              className="p-3 text-gray-500 hover:text-indigo-600 transition-colors rounded-full"
              onClick={() => console.log('Attach file clicked')}
            >
              <PaperclipIcon className="h-6 w-6 transform rotate-45" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 p-3 rounded-full bg-white/70 text-gray-800 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
            />

            {/* Emoji Button (moved to the right end of the text box) */}
            <button
              className="p-3 text-gray-500 hover:text-indigo-600 transition-colors rounded-full"
              onClick={() => console.log('Emoji clicked')}
            >
              <SmileIcon className="h-6 w-6" />
            </button>

            {/* Send Button */}
            <button 
              onClick={sendMessage} 
              className="p-3 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 
                         transition-all duration-150 transform hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 4px 8px rgba(99, 102, 241, 0.4)' }}
            >
              <NewSendArrow />
            </button>
          </div>
        </div>
      </div>
    );
}

export default ChatWindow;
