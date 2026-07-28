"use client";

import Link from "next/link";
import { ArrowRight, Wheat } from "lucide-react";

const GRAINS = [
  { left: "8%", delay: "0s", duration: "9s", color: "#f59e0b", size: 7 },
  { left: "18%", delay: "1.2s", duration: "11s", color: "#eab308", size: 9 },
  { left: "28%", delay: "2.4s", duration: "8s", color: "#d97706", size: 6 },
  { left: "42%", delay: "0.6s", duration: "10s", color: "#ca8a04", size: 8 },
  { left: "55%", delay: "3s", duration: "12s", color: "#fbbf24", size: 7 },
  { left: "68%", delay: "1.8s", duration: "9.5s", color: "#f59e0b", size: 10 },
  { left: "78%", delay: "0.3s", duration: "11.5s", color: "#eab308", size: 6 },
  { left: "88%", delay: "2.1s", duration: "8.5s", color: "#d97706", size: 8 },
  { left: "95%", delay: "4s", duration: "10.5s", color: "#f59e0b", size: 7 },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden auth-bg flex flex-col">
      {/* Falling feed grains */}
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

      {/* Soft grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Decorative feed silhouettes */}
      <div className="absolute left-[6%] bottom-[18%] hidden md:block sprout-sway opacity-80">
        <Wheat className="w-16 h-16 text-emerald-600/40" strokeWidth={1.25} />
      </div>
      <div className="absolute right-[8%] top-[22%] hidden md:block feed-bag opacity-90">
        <div className="w-20 h-24 rounded-2xl bg-gradient-to-b from-amber-200 to-amber-400 shadow-lg shadow-amber-200/50 border border-amber-300/60 flex items-center justify-center">
          <span className="text-[10px] font-bold text-amber-900/70 tracking-widest rotate-[-8deg]">FEED</span>
        </div>
      </div>

      {/* Center content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-8 fade-up">
          <span className="absolute inset-0 rounded-3xl pulse-ring bg-emerald-400/30" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center brand-glow shadow-xl shadow-emerald-500/25">
            <Wheat className="w-9 h-9 text-white" strokeWidth={1.75} />
          </div>
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-900 fade-up fade-up-delay-1">
          Metro{" "}
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">
            Feeds
          </span>
        </h1>

        <p className="mt-4 text-lg sm:text-xl text-slate-500 font-medium tracking-wide fade-up fade-up-delay-2">
          Trade Smart. Feed Better.
        </p>

        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-emerald-400 fade-up fade-up-delay-2" />

        <Link
          href="/login"
          className="group mt-12 inline-flex items-center gap-2.5 px-9 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/35 transition-all duration-300 cursor-pointer fade-up fade-up-delay-3"
        >
          Enter System
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </main>

      {/* Animated bottom wave */}
      <div className="relative z-10 h-24 overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-[200%] h-full wave-path" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path
            fill="rgba(16,185,129,0.12)"
            d="M0,64 C240,110 480,20 720,64 C960,108 1200,30 1440,64 L1440,120 L0,120 Z"
          />
          <path
            fill="rgba(5,150,105,0.18)"
            d="M0,80 C240,40 480,100 720,70 C960,40 1200,90 1440,60 L1440,120 L0,120 Z"
          />
        </svg>
      </div>
    </div>
  );
}
