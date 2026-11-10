"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { Lock, Mail, Eye, EyeOff, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col">
      <header className="h-12 px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="Omni Hub home">
          <span className="oh-brand-mark" aria-hidden />
          <span className="leading-tight">
            <span className="oh-brand-name block">Omni Hub</span>
            <span className="oh-brand-sub">Operations &amp; Finance</span>
          </span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] page-enter">
          <div className="oh-card p-7 sm:p-8">
            <div className="mb-6">
              <h1 className="oh-ph-title">Sign in</h1>
              <p className="oh-ph-sub">Use your Omni Hub account to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-[12px] font-medium text-[var(--ink-2)]">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ink-3)] pointer-events-none" aria-hidden />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="input-field !pl-9"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-[12px] font-medium text-[var(--ink-2)]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ink-3)] pointer-events-none" aria-hidden />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="input-field !pl-9 !pr-10"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-2">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-[var(--line)] flex items-start gap-2.5 text-[12px] text-[var(--ink-3)] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[var(--brand)] shrink-0 mt-0.5" aria-hidden />
              <p>Authorized access only. Contact your administrator if you need credentials or assistance.</p>
            </div>
          </div>

          <p className="text-center text-[12px] text-[var(--ink-3)] mt-5">
            Omni Hub · Operations &amp; Finance
          </p>
        </div>
      </main>
    </div>
  );
}
