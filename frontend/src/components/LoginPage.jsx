import { useState } from "react";
import { login } from "../services/authService";

export default function LoginPage({ onAuthSuccess, onGoRegister }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      onAuthSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Ambient glow blobs */}
      <div className="auth-blob auth-blob--left" />
      <div className="auth-blob auth-blob--right" />

      <div className="auth-card">
        {/* Logo mark */}
        <div className="auth-logo">
          <div className="auth-logo-icon">C</div>
          <span className="auth-logo-name">Code Collab</span>
        </div>

        <div className="auth-card-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Sign in to your workspace and start collaborating.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">
              EMAIL ADDRESS
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon auth-input-icon--left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </span>
              <input
                id="login-email"
                className="auth-input auth-input--icon-left"
                type="email"
                placeholder="dev@codecollab.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">
              PASSWORD
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon auth-input-icon--left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="login-password"
                className="auth-input auth-input--icon-both"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-input-icon auth-input-icon--right auth-eye-btn"
                onClick={() => setShowPw((p) => !p)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}

          {/* Submit */}
          <button
            id="login-submit"
            className="auth-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? <span className="auth-spinner" /> : null}
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account?{" "}
          <button className="auth-switch-btn" onClick={onGoRegister}>
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
