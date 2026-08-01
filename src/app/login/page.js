"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { Lock, Mail, Eye, EyeOff, ArrowLeft, Loader2, Wheat, ShieldCheck } from "lucide-react";

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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 flex flex-col justify-center">
      {/* 1. Diagonal brushed steel micro-grain pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 10px),
            repeating-linear-gradient(-45deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 10px)
          `,
          backgroundSize: "30px 30px"
        }}
      />

      {/* 2. Soft horizontal specular gleam/sheen effect */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-[0.3]">
        <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-transparent via-white/8 to-transparent animate-sheen" />
      </div>

      {/* 3. Slow ambient silver/blue light blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[25%] w-[450px] h-[450px] rounded-full bg-slate-600/5 blur-[100px] animate-blob-one" />
        <div className="absolute bottom-[20%] right-[25%] w-[500px] h-[500px] rounded-full bg-blue-900/5 blur-[120px] animate-blob-two" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[440px] page-enter">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>

          {/* Luxury Brushed Slate Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80">
            <div className="text-center mb-8">
              <div className="relative inline-flex mb-5">
                <span className="absolute inset-0 rounded-2xl animate-ping bg-blue-500/20 opacity-30" aria-hidden />
                <div className="relative w-[3.75rem] h-[3.75rem] rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center shadow-lg border border-white/20">
                  <Wheat className="w-8 h-8 text-blue-300" strokeWidth={1.75} />
                </div>
              </div>
              <h1 className="text-[1.65rem] sm:text-[1.75rem] font-bold text-white tracking-wide leading-tight">
                Warraich <span className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">Traders</span>
              </h1>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-2">ERP SYSTEM ACCESS</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-white/10 focus:border-blue-500/50 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-11 pr-11 py-3 bg-slate-950/60 border border-white/10 focus:border-blue-500/50 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="brand"
                disabled={submitting}
                className="w-full justify-center py-3.5 mt-2 text-[0.9375rem] font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/20 shadow-lg shadow-blue-900/35"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  "Access Portal"
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden />
              <p>
                Authorized Access Only. Contact system administrator if you require credentials or assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
