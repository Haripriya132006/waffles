import React, { useState, useEffect } from "react";
import Login from "./components/login";
import Signin from "./components/signin";
import RequestPanel from "./components/requestpanel";
import ChatWindow from "./components/chatwindow";
import "./App.css";

function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      <span className="theme-toggle__track">
        <span className="theme-toggle__thumb">
          {theme === "dark" ? "🌙" : "☀️"}
        </span>
      </span>
    </button>
  );
}

function App() {
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [chatPartner, setChatPartner] = useState("");
  const [showSignup, setShowSignup] = useState(false);

  const goToSignup = () => setShowSignup(true);
  const goToLogin = () => setShowSignup(false);

  if (!username) {
    return (
      <>
        <ThemeToggle />
        {showSignup ? (
          <Signin goToLogin={goToLogin} setUsername={setUsername} />
        ) : (
          <Login setUsername={setUsername} goToSignup={goToSignup} />
        )}
      </>
    );
  }

  return (
    <>
      <ThemeToggle />
      {chatPartner ? (
        <ChatWindow
          currentUser={username}
          chatPartner={chatPartner}
          goBack={() => setChatPartner("")}
          logout={() => {
            localStorage.removeItem("username");
            setUsername("");
          }}
        />
      ) : (
        <RequestPanel
          currentUser={username}
          setChatPartner={setChatPartner}
          setUserName={setUsername}
        />
      )}
    </>
  );
}

export default App;