import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import "./RequestPanel.css";

const BASE_URL = "https://chatapp-yc2g.onrender.com";

function Avatar({ name, size = 38 }) {
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

function RequestPanel({ currentUser, setChatPartner, setUserName }) {
  const [allowedUsers, setAllowedUsers]       = useState([]);
  const [blockedUsers, setBlockedUsers]       = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [newUser, setNewUser]                 = useState("");
  const [activeTab, setActiveTab]             = useState("chats");
  const [feedback, setFeedback]               = useState("");
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [unreadCounts, setUnreadCounts]       = useState({}); // { username: count }

  const ws             = useRef(null);
  const activeChatRef  = useRef(null); // which chat is currently open

  useEffect(() => {
    fetchAllowedUsers();
    fetchPendingRequests();
    requestNotifPermission();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background WebSocket: tracks incoming msgs for unread + notifs ──
  useEffect(() => {
    if (!currentUser) return;

    const connect = () => {
      ws.current = new WebSocket(`wss://chatapp-yc2g.onrender.com/wss/${currentUser}`);

      ws.current.onmessage = (event) => {
        const raw = JSON.parse(event.data);

        // Ignore edit/delete/presence events
        if (raw.type || !raw.from_user) return;

        const sender = raw.from_user;

        // Don't count if this chat is currently open
        if (activeChatRef.current === sender) return;

        // Bump unread count
        setUnreadCounts(prev => ({
          ...prev,
          [sender]: (prev[sender] || 0) + 1,
        }));

        // Fire OS notification if tab not focused
        fireNotification(sender, raw.text, raw.attachment);
      };

      ws.current.onclose = () => setTimeout(connect, 3000);
      ws.current.onerror = () => ws.current?.close();
    };

    connect();
    return () => ws.current?.close();
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update browser tab title with total unread
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Waffles` : "Waffles";
  }, [totalUnread]);

  const requestNotifPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const fireNotification = (sender, text, attachment) => {
    if (document.visibilityState === "visible") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    let body = text || "";
    if (attachment?.kind === "voice")    body = "🎤 Voice message";
    if (attachment?.kind === "image")    body = "📷 Image";
    if (attachment?.kind === "document") body = `📄 ${attachment.name}`;

    new Notification(sender, {
      body: body || "Sent you a message",
      icon: "/favicon.ico",
      tag: sender, // collapses multiple notifs from same sender
    });
  };

  const openChat = (user) => {
    activeChatRef.current = user;
    setUnreadCounts(prev => ({ ...prev, [user]: 0 }));
    setChatPartner(user);
  };

  const fetchAllowedUsers = async () => {
    const res = await axios.get(`${BASE_URL}/allowed-users/${currentUser}`);
    const data = res.data;
    setAllowedUsers(data.filter(r => r.status === "accepted").map(r => r.user));
    setBlockedUsers(data.filter(r => r.status === "blocked").map(r => r.user));
  };

  const fetchPendingRequests = async () => {
    const res = await axios.get(`${BASE_URL}/pending-requests/${currentUser}`);
    setPendingRequests(res.data);
  };

  const sendRequest = async () => {
    if (!newUser || newUser === currentUser) return;
    await axios.post(`${BASE_URL}/request-chat`, { from_user: currentUser, to_user: newUser });
    setFeedback(`Request sent to ${newUser}`);
    setNewUser("");
    fetchPendingRequests();
    setTimeout(() => setFeedback(""), 3000);
  };

  const acceptRequest = async (fromUser) => {
    await axios.post(`${BASE_URL}/accept-chat`, { from_user: fromUser, to_user: currentUser });
    fetchAllowedUsers();
    fetchPendingRequests();
    setActiveTab("chats");
  };

  const rejectRequest = async (fromUser) => {
    await axios.post(`${BASE_URL}/reject-chat`, { from_user: fromUser, to_user: currentUser });
    fetchPendingRequests();
  };

  const toggleBlock = async (user) => {
    const isBlocked = blockedUsers.includes(user);
    await axios.post(`${BASE_URL}/update-status`, {
      from_user: currentUser,
      to_user: user,
      new_status: isBlocked ? "accepted" : "blocked",
    });
    fetchAllowedUsers();
  };

  const switchTab = (key) => {
    setActiveTab(key);
    setSidebarOpen(false);
  };

  const tabs = [
    { key: "chats",    label: "Chats",    count: allowedUsers.length },
    { key: "requests", label: "Requests", count: pendingRequests.length },
    { key: "add",      label: "Add",      count: 0 },
  ];

  return (
    <div className="rp-shell">

      {sidebarOpen && (
        <div className="rp-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`rp-sidebar ${sidebarOpen ? "rp-sidebar--open" : ""}`}>
        <div className="rp-sidebar__top">
          <div className="rp-brand" onClick={() => setSidebarOpen(false)}>
            <div className="rp-brand__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  fill="var(--accent)" opacity="0.2" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="rp-brand__name">Waffles</span>
          </div>

          <nav className="rp-nav">
            {tabs.map(({ key, label, count }) => (
              <button key={key}
                className={`rp-nav__item ${activeTab === key ? "active" : ""}`}
                onClick={() => switchTab(key)}
              >
                <span className="rp-nav__label">{label}</span>
                {count > 0 && <span className="rp-badge">{count}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="rp-sidebar__bottom">
          <div className="rp-user">
            <Avatar name={currentUser} size={30} />
            <span className="rp-user__name">{currentUser}</span>
          </div>
          <button className="rp-logout" title="Sign out"
            onClick={() => { localStorage.removeItem("username"); setUserName(""); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </aside>

      <main className="rp-main">

        <div className="rp-topbar">
          <button className="rp-topbar__menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <div className="rp-brand__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  fill="var(--accent)" opacity="0.2" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="rp-brand__name">Waffles</span>
          </button>

          <div className="rp-topbar__tabs">
            {tabs.map(({ key, label, count }) => (
              <button key={key}
                className={`rp-pill ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
                {count > 0 && <span className="rp-pill__badge">{count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chats tab ── */}
        {activeTab === "chats" && (
          <div className="rp-section">
            <h2 className="rp-section__title">Chats</h2>
            {allowedUsers.length === 0 ? (
              <div className="rp-empty">
                <div className="rp-empty__icon">💬</div>
                <p>No chats yet</p>
                <span>Add someone to start chatting</span>
              </div>
            ) : (
              <ul className="rp-list">
                {allowedUsers.map((u) => (
                  <li key={u}>
                    <div className="rp-item">
                      <div className="rp-item__avatar-wrap">
                        <Avatar name={u} />
                        {unreadCounts[u] > 0 && (
                          <span className="rp-unread-dot">
                            {unreadCounts[u] > 99 ? "99+" : unreadCounts[u]}
                          </span>
                        )}
                      </div>
                      <div className="rp-item__info">
                        <span className={`rp-item__name ${unreadCounts[u] > 0 ? "rp-item__name--unread" : ""}`}>
                          {u}
                        </span>
                        {blockedUsers.includes(u) && (
                          <span className="rp-item__blocked">Blocked</span>
                        )}
                      </div>
                      <div className="rp-item__actions">
                        {!blockedUsers.includes(u) && (
                          <button className="rp-btn rp-btn--primary" onClick={() => openChat(u)}>
                            Chat
                          </button>
                        )}
                        <button
                          className={`rp-btn ${blockedUsers.includes(u) ? "rp-btn--unblock" : "rp-btn--ghost"}`}
                          onClick={() => toggleBlock(u)}
                        >
                          {blockedUsers.includes(u) ? "Unblock" : "Block"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Requests tab ── */}
        {activeTab === "requests" && (
          <div className="rp-section">
            <h2 className="rp-section__title">Incoming requests</h2>
            {pendingRequests.length === 0 ? (
              <div className="rp-empty">
                <div className="rp-empty__icon">📭</div>
                <p>No pending requests</p>
              </div>
            ) : (
              <ul className="rp-list">
                {pendingRequests.map((req, index) => (
                  <li key={index}>
                    <div className="rp-item">
                      <Avatar name={req.from_user} />
                      <div className="rp-item__info">
                        <span className="rp-item__name">{req.from_user}</span>
                        <span className="rp-item__sub">Wants to chat</span>
                      </div>
                      <div className="rp-item__actions">
                        <button className="rp-btn rp-btn--accept" onClick={() => acceptRequest(req.from_user)}>Accept</button>
                        <button className="rp-btn rp-btn--reject" onClick={() => rejectRequest(req.from_user)}>Reject</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Add tab ── */}
        {activeTab === "add" && (
          <div className="rp-section">
            <h2 className="rp-section__title">Send chat request</h2>
            <div className="rp-add-form">
              <input
                className="rp-input"
                type="text"
                placeholder="Enter username…"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendRequest()}
              />
              <button className="rp-btn rp-btn--primary rp-btn--send" onClick={sendRequest}>
                Send
              </button>
            </div>
            {feedback && <div className="rp-feedback">{feedback}</div>}
          </div>
        )}
      </main>
    </div>
  );
}

export default RequestPanel;