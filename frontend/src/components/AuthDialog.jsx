import React, { useEffect, useState } from "react";
import { X, Loader2, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { LOGIN, REGISTER } from "../constants/testIds/auth";

export default function AuthDialog({ open, reason, onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open, mode]);

  if (!open) return null;
  const isLogin = mode === "login";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.email, form.password, form.name);
      setForm({ name: "", email: "", password: "" });
      onClose();
    } catch (err) {
      setError(err.response ? formatApiErrorDetail(err.response.data?.detail) : "Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="auth-dialog"
      className="absolute inset-0 z-[70] flex items-center justify-center px-4"
      style={{ background: "rgba(5,5,7,0.82)", backdropFilter: "blur(14px)" }}
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[94vh] overflow-y-auto no-scrollbar"
        style={{ background: "var(--bg-surface-1)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 data-testid="auth-dialog-title" className="font-display text-2xl font-semibold">
              {isLogin ? "Sign in" : "Create account"}
            </h2>
            <p data-testid="auth-dialog-reason" className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {reason || "Sync your queue and settings across devices."}
            </p>
          </div>
          <button
            type="button"
            data-testid="auth-dialog-close"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center rounded-full shrink-0 active:scale-90 transition-transform"
            style={{ width: 44, height: 44, background: "rgba(255,255,255,0.06)" }}
          >
            <X size={22} />
          </button>
        </div>

        {!isLogin && (
          <Field testId={REGISTER.nameInput} label="Name (optional)" value={form.name} onChange={set("name")} autoComplete="name" />
        )}
        <Field
          testId={isLogin ? LOGIN.emailInput : REGISTER.emailInput}
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
        />
        <Field
          testId={isLogin ? LOGIN.passwordInput : REGISTER.passwordInput}
          label={isLogin ? "Password" : "Password (min 8 characters)"}
          type="password"
          required
          minLength={isLogin ? 1 : 8}
          value={form.password}
          onChange={set("password")}
          autoComplete={isLogin ? "current-password" : "new-password"}
        />

        {error && (
          <p data-testid="auth-error" className="text-sm rounded-lg px-3 py-2" style={{ background: "rgba(255,69,58,0.12)", color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          data-testid={isLogin ? LOGIN.submitButton : REGISTER.submitButton}
          className="w-full h-14 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#050507" }}
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
          {isLogin ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          data-testid={isLogin ? LOGIN.registerLink : REGISTER.loginLink}
          onClick={() => setMode(isLogin ? "register" : "login")}
          className="w-full h-12 rounded-xl text-sm"
          style={{ color: "var(--accent)" }}
        >
          {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, testId, ...props }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <input
        data-testid={testId}
        {...props}
        className="mt-2 w-full h-14 rounded-xl px-4 text-base outline-none focus:ring-2"
        style={{ background: "var(--bg-surface-2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
      />
    </label>
  );
}
