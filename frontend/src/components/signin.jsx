import React, { useState } from 'react';
import axios from 'axios';
import "./Auth.css";

const BASE_URL = "https://chatapp-yc2g.onrender.com";

function Signin({ goToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!username || !password || !question || !answer) {
      setError("All fields are required.");
      return;
    }
    try {
      await axios.post(`${BASE_URL}/signup`, { username, password, question, answer });
      alert('Signup successful! You can now log in.');
      goToLogin();
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(`Signup failed: ${err.response.data.detail}`);
      } else {
        setError(`Signup failed: ${err.message}`);
      }
    }
  };

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

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">It's free — get started now</p>

        <div className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Username</label>
            <input
              className="auth-input"
              placeholder="choose_a_username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
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
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-divider" />

          <div className="auth-field">
            <label className="auth-label">Security question</label>
            <input
              className="auth-input"
              placeholder="e.g. What was your first pet's name?"
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setError(''); }}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Answer</label>
            <input
              className="auth-input"
              placeholder="Your answer"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setError(''); }}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="auth-actions">
            <button className="auth-btn" onClick={handleSignup}>Create account</button>
          </div>
        </div>

        <p className="auth-switch">
          Already have an account?{" "}
          <button className="auth-link" onClick={goToLogin}>Sign in</button>
        </p>
      </div>
    </div>
  );
}

export default Signin;