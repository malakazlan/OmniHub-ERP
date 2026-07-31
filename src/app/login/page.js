"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { Lock, Mail, Eye, EyeOff, ArrowLeft, Loader2, Wheat, ShieldCheck } from "lucide-react";

const GRAINS = [
  { left: "8%", delay: "0s", duration: "11s", color: "#f59e0b", size: 7 },
  { left: "22%", delay: "1.4s", duration: "9s", color: "#eab308", size: 6 },
  { left: "38%", delay: "0.6s", duration: "12s", color: "#d97706", size: 8 },
  { left: "55%", delay: "2.1s", duration: "10s", color: "#fbbf24", size: 5 },
  { left: "72%", delay: "0.2s", duration: "11s", color: "#ca8a04", size: 7 },
  { left: "88%", delay: "2.8s", duration: "9.5s", color: "#f59e0b", size: 6 },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, login } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) {
      showToast("Please enter both email and password.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await login(trimmed, password);
      showToast("Welcome back!", "success");
    } catch (err) {
      showToast(err.message || "Invalid login credentials.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden auth-bg flex flex-col">
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {GRAINS.map((g, i) => (
        <span
          key={i}
          className="feed-grain"
          style={{
            left: g.left,
            animationDelay: g.delay,
            animationDuration: g.duration,
            background: g.color,
            width: g.size,
            height: g.size,
          }}
        />
      ))}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[440px] page-enter">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-emerald-700 transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>

          <div className="login-card p-8 sm:p-10">
            <div className="text-center mb-8">
              <div className="relative inline-flex mb-5">
                <span className="absolute inset-0 rounded-2xl pulse-ring bg-emerald-400/20" aria-hidden />
                <div className="relative w-[3.75rem] h-[3.75rem] rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-600/10">
                  <Wheat className="w-8 h-8 text-white" strokeWidth={1.75} />
                </div>
              </div>
              <h1 className="text-[1.65rem] sm:text-[1.75rem] font-bold text-slate-900 tracking-tight leading-tight">
                Warraich <span className="text-emerald-600">Traders</span>
              </h1>
              <p className="text-sm text-slate-500 mt-2">Sign in to your ERP account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Email
                </label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" aria-hidden />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Password
                </label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" aria-hidden />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="input-field pr-11"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="brand"
                disabled={submitting}
                className="w-full justify-center py-3.5 mt-2 text-[0.9375rem] font-semibold rounded-xl"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden />
              <p>
                Authorized Access Only · Secure end-to-end encrypted session. 
                Contact your system administrator for credentials or technical assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
