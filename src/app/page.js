"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";

// Layer 1: Deep midnight background (base)
const MidnightBackground = () => {
  return (
    <div className="absolute inset-0 bg-[#020617]" />
  );
};

// Layer 2: Animated grid system at 5% opacity
const AnimatedGrid = () => {
  return (
    <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
        animate={{
          backgroundPosition: ["0px 0px", "80px 80px", "0px 0px"],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
};

// Layer 3: Aurora gradient movement - extremely soft
const AuroraGradient = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute top-[-20%] left-[-10%] w-[120%] h-[50%]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(37, 99, 235, 0.08) 40%, rgba(6, 182, 212, 0.05) 70%, transparent 100%)',
          filter: 'blur(100px)',
        }}
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -20, 15, 0],
          scaleX: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-[-20%] right-[-10%] w-[120%] h-[50%]"
        style={{
          background: 'linear-gradient(0deg, transparent 0%, rgba(139, 92, 246, 0.07) 40%, rgba(37, 99, 235, 0.04) 70%, transparent 100%)',
          filter: 'blur(120px)',
        }}
        animate={{
          x: [0, -60, 50, 0],
          y: [0, 30, -15, 0],
          scaleX: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute top-[25%] left-[35%] w-[30%] h-[30%]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

// Layer 4: Noise texture
const NoiseTexture = () => {
  return (
    <div
      className="absolute inset-0 opacity-[0.03] pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
};

// Layer 5: Light beams - very subtle
const LightBeams = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-[1px] w-full"
          style={{
            top: `${20 + i * 18}%`,
            background: 'linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.15) 50%, transparent 100%)',
            filter: 'blur(1px)',
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 14 + i * 1.5,
            repeat: Infinity,
            delay: i * 1.5,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Layer 6: Large radial atmospheric glow behind centerpiece
const AtmosphericGlow = () => {
  return (
    <motion.div
      className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[90vw] md:w-[60vw] h-[50vh]"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.12) 0%, rgba(6, 182, 212, 0.06) 40%, transparent 70%)',
        filter: 'blur(80px)',
      }}
      animate={{
        opacity: [0.6, 0.9, 0.6],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

// Layer 7: Floating particles - 20-40 very slow movement
const FloatingParticles = () => {
  const [particles, setParticles] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const generatedParticles = Array.from({ length: 32 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      duration: Math.random() * 25 + 20,
      delay: Math.random() * 10,
      xMotion: Math.random() * 25 - 12.5,
      yMotion: Math.random() * 25 - 12.5,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    setParticles(generatedParticles);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
          }}
          animate={{
            y: [0, particle.yMotion, 0],
            x: [0, particle.xMotion, 0],
            opacity: [particle.opacity * 0.5, particle.opacity, particle.opacity * 0.5],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// SPECTACULAR ENERGY CORE CENTERPIECE
const EnergyCore = ({ mousePosition }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [0, window.innerHeight], [8, -8]);
  const rotateY = useTransform(mouseX, [0, window.innerWidth], [-8, 8]);

  return (
    <motion.div
      className="absolute top-[10%] md:top-[5%] left-1/2 -translate-x-1/2 w-[80vw] sm:w-[50vw] md:w-[35vw] h-[40vh] md:h-[45vh] max-w-[500px] max-h-[550px] min-w-[250px] md:min-w-[300px] min-h-[300px] md:min-h-[400px]"
      style={{
        rotateX,
        rotateY,
        perspective: 1000,
      }}
      animate={{
        y: [0, -15, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Main glass core structure */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 50%, rgba(255, 255, 255, 0.05) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.05) inset,
            0 25px 50px -12px rgba(37, 99, 235, 0.25),
            0 0 100px -20px rgba(6, 182, 212, 0.15)
          `,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 120,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {/* Inner glow layers */}
        <motion.div
          className="absolute inset-[15%]"
          style={{
            background: 'radial-gradient(ellipse at 30% 30%, rgba(37, 99, 235, 0.2) 0%, rgba(6, 182, 212, 0.1) 50%, transparent 70%)',
            borderRadius: '15px',
            filter: 'blur(20px)',
          }}
          animate={{
            opacity: [0.6, 1, 0.6],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Bright core center */}
        <motion.div
          className="absolute inset-[35%]"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(37, 99, 235, 0.4) 40%, transparent 70%)',
            borderRadius: '10px',
            filter: 'blur(15px)',
          }}
          animate={{
            opacity: [0.7, 1, 0.7],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Glass reflection layers */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 40%, rgba(255, 255, 255, 0.05) 100%)',
            borderRadius: '20px',
          }}
        />

        {/* Refractive edge glow */}
        <motion.div
          className="absolute inset-0 rounded-[20px]"
          style={{
            border: '1px solid transparent',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.3)) border-box',
            WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Internal energy lines */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: '50%',
              left: '50%',
              width: '80%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.4), transparent)',
              filter: 'blur(1px)',
            }}
            animate={{
              rotate: [i * 60, i * 60 + 360],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

        {/* Floating energy particles within core */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-white/70"
            style={{
              top: '50%',
              left: '50%',
            }}
            animate={{
              x: [0, Math.cos(i * 60 * Math.PI / 180) * 60],
              y: [0, Math.sin(i * 60 * Math.PI / 180) * 60],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      {/* Outer volumetric glow */}
      <motion.div
        className="absolute inset-[-20%]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.15) 0%, rgba(6, 182, 212, 0.08) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
};

// Premium glassmorphism button
const PremiumButton = ({ children, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.button
      className="relative overflow-hidden px-8 py-3 md:px-10 md:py-4 rounded-lg text-white font-medium tracking-wide text-sm md:text-base"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: `
          0 0 0 1px rgba(255, 255, 255, 0.05) inset,
          0 8px 32px -8px rgba(37, 99, 235, 0.3)
        `,
      }}
    >
      {/* Internal glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.2) 0%, transparent 70%)',
        }}
        animate={{
          opacity: isHovered ? 1 : 0.5,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Shine sweep animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        animate={{
          x: isHovered ? ['-100%', '100%'] : '-100%',
        }}
        transition={{
          duration: 0.8,
          ease: "easeInOut",
        }}
      />
      
      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          border: '1px solid transparent',
          background: 'linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.5), transparent) border-box',
          WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
      
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

// Main landing page component
export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Layer 1: Deep midnight background */}
      <MidnightBackground />
      
      {/* Layer 2: Animated grid system */}
      <AnimatedGrid />
      
      {/* Layer 3: Aurora gradient movement */}
      <AuroraGradient />
      
      {/* Layer 4: Noise texture */}
      <NoiseTexture />
      
      {/* Layer 5: Light beams */}
      <LightBeams />
      
      {/* Layer 6: Large radial atmospheric glow */}
      <AtmosphericGlow />
      
      {/* Layer 7: Floating particles */}
      <FloatingParticles />

      {/* SPECTACULAR ENERGY CORE CENTERPIECE */}
      <EnergyCore mousePosition={mousePosition} />

      {/* Mouse-reactive spotlight */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(500px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(37, 99, 235, 0.06), transparent 70%)`,
        }}
      />

      {/* Content - positioned below energy core */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 mt-20 md:mt-0">
        {/* Company name with gradient treatment */}
        <motion.div
          className="text-center w-full max-w-[90vw] md:max-w-[65vw]"
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight mb-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white drop-shadow-2xl" style={{ textShadow: '0 0 40px rgba(37, 99, 235, 0.4)' }}>WARRAICH</span>
            <span className="bg-gradient-to-r from-[#60A5FA] to-[#22D3EE] bg-clip-text text-transparent">
              TRADERS
            </span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="text-xs sm:text-sm md:text-lg text-white/70 tracking-[0.15em] sm:tracking-[0.25em] uppercase mb-10 md:mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
        >
          Enterprise Resource Planning
        </motion.p>

        {/* Access Portal Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1, ease: "easeOut" }}
        >
          <Link href="/login">
            <PremiumButton>Access Portal →</PremiumButton>
          </Link>
        </motion.div>
      </div>

      {/* Volumetric rays effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full"
          style={{
            background: 'radial-gradient(ellipse at 50% 20%, rgba(37, 99, 235, 0.05) 0%, transparent 50%)',
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Deep vignette for cinematic depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(2, 6, 23, 0.5) 100%)',
        }}
      />

      {/* Professional Software Creator Credit Footer */}
      <motion.footer
        className="absolute bottom-5 inset-x-0 z-20 text-center px-4 pointer-events-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
      >
        <p className="text-[11px] sm:text-xs text-slate-400/80 tracking-widest uppercase font-medium">
          Designed & Engineered by{" "}
          <span className="text-slate-200 font-bold tracking-wider hover:text-blue-400 transition-colors">
            AL-JANNAT SYSTEMS
          </span>
        </p>
      </motion.footer>
    </div>
  );
}
