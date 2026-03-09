import React, { useState } from "react";
import axios from "axios";
import "./Auth.css";

const BASE_URL = "https://chatapp-yc2g.onrender.com";

function Login({ setUsername, goToSignup }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [showRecovery, setShowRecovery] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isAnswerVerified, setIsAnswerVerified] = useState(false);

  const handleLogin = async () => {
    if (!name.trim() || !password.trim()) {
      setError("Both fields are required.");
      return;
    }
    try {
      await axios.post(`${BASE_URL}/login`, {
        username: name.trim(),
        password: password.trim(),
      });
      localStorage.setItem("username", name.trim());
      setUsername(name.trim());
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed.");
    }
  };

  const fetchSecurityQuestion = async () => {
    if (!name.trim()) { setError("Enter your username first."); return; }
    try {
      const res = await axios.get(`${BASE_URL}/recovery-question/${name.trim()}`);
      setQuestion(res.data.question);
      setShowRecovery(true);
      setError("");
    } catch {
      setError("User not found.");
    }
  };

  const verifyAnswer = async () => {
    try {
      await axios.post(`${BASE_URL}/reset-password`, {
        username: name.trim(),
        answer: answer.trim(),
        new_password: "TEMP",
      });
      setIsAnswerVerified(true);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Answer verification failed.");
    }
  };

  const handleResetPassword = async () => {
    try {
      await axios.post(`${BASE_URL}/reset-password`, {
        username: name.trim(),
        answer: answer.trim(),
        new_password: newPassword.trim(),
      });
      alert("Password reset successful. You can log in now.");
      setShowRecovery(false);
      setPassword("");
      setAnswer("");
      setNewPassword("");
      setIsAnswerVerified(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Reset failed.");
    }
  };

  /* ── Recovery flow ── */
  if (showRecovery) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-brand__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  fill="var(--accent)" opacity="0.2" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="auth-brand__name">Helio</span>
          </div>

          <h1 className="auth-title">Reset password</h1>
          <p className="auth-subtitle">Answer your security question to continue</p>

          <div className="auth-form">
            <div className="auth-security-box">
              <strong>Security question</strong>
              <span>{question}</span>
            </div>

            {!isAnswerVerified ? (
              <>
                <div className="auth-field">
                  <label className="auth-label">Your answer</label>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Enter your answer"
                    value={answer}
                    onChange={(e) => { setAnswer(e.target.value); setError(""); }}
                  />
                </div>
                {error && <p className="auth-error">{error}</p>}
                <div className="auth-actions">
                  <button className="auth-btn" onClick={verifyAnswer}>Verify answer</button>
                  <button className="auth-btn auth-btn--ghost" onClick={() => setShowRecovery(false)}>Back to login</button>
                </div>
              </>
            ) : (
              <>
                <div className="auth-field">
                  <label className="auth-label">New password</label>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  />
                </div>
                {error && <p className="auth-error">{error}</p>}
                <div className="auth-actions">
                  <button className="auth-btn" onClick={handleResetPassword}>Reset password</button>
                  <button className="auth-btn auth-btn--ghost" onClick={() => setShowRecovery(false)}>Back to login</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Login flow ── */
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                fill="var(--accent)" opacity="0.2" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="auth-brand__name">Helio</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue</p>

        <div className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Username</label>
            <input
              className="auth-input"
              type="text"
              placeholder="your_username"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              autoComplete="username"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="auth-actions">
            <button className="auth-btn" onClick={handleLogin}>Sign in</button>
            <div className="auth-divider" />
            <button className="auth-btn auth-btn--ghost" onClick={fetchSecurityQuestion}>Forgot password</button>
          </div>
        </div>

        <p className="auth-switch">
          No account?{" "}
          <button className="auth-link" onClick={goToSignup}>Create one</button>
        </p>
      </div>
    </div>
  );
}

export default Login;