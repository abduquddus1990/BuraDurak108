import React from 'react';

interface ChoynakPiyolaProps {
  className?: string;
}

export const ChoynakPiyola: React.FC<ChoynakPiyolaProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-end gap-2 select-none pointer-events-none ${className}`}>
      {/* 1. Realistik Milliy Paxtagul Choynak */}
      <div className="relative flex flex-col items-center">
        {/* Bug' (Steam effect) */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1 opacity-70">
          <span className="w-1 h-3 bg-white/40 rounded-full blur-[1px] animate-pulse" />
          <span className="w-1.5 h-4 bg-white/50 rounded-full blur-[1px] animate-bounce" style={{ animationDelay: '200ms' }} />
        </div>

        <svg width="64" height="52" viewBox="0 0 100 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
          {/* Qopqoq ushlagichi */}
          <circle cx="50" cy="12" r="5" fill="#eab308" stroke="#78350f" strokeWidth="2" />
          {/* Qopqoq */}
          <path d="M35 24 C35 16, 65 16, 65 24 Z" fill="#1e3a8a" stroke="#eab308" strokeWidth="2" />
          {/* Choynak tanasi */}
          <ellipse cx="50" cy="50" rx="36" ry="28" fill="#1e3a8a" stroke="#eab308" strokeWidth="3" />
          {/* Paxtagul naqshi */}
          <path d="M50 35 C42 45, 42 55, 50 65 C58 55, 58 45, 50 35 Z" fill="#ffffff" />
          <path d="M38 50 C44 42, 56 42, 62 50 C56 58, 44 58, 38 50 Z" fill="#ffffff" />
          <circle cx="50" cy="50" r="4" fill="#eab308" />
          {/* Burni (Spout) */}
          <path d="M18 45 C10 35, 6 22, 10 18 C14 20, 16 32, 24 40 Z" fill="#1e3a8a" stroke="#eab308" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Bandi (Handle) */}
          <path d="M80 35 C96 42, 96 62, 78 68" stroke="#eab308" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Taglik */}
          <ellipse cx="50" cy="76" rx="20" ry="4" fill="#0f172a" />
        </svg>
      </div>

      {/* 2. Realistik Paxtagul Piyola va Ko'k Choy */}
      <div className="relative pb-1">
        <svg width="40" height="30" viewBox="0 0 70 55" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
          {/* Piyola tanasi */}
          <path d="M10 16 C12 38, 22 48, 35 48 C48 48, 58 38, 60 16 Z" fill="#1e3a8a" stroke="#eab308" strokeWidth="2.5" />
          {/* Ko'k choy yuzasi */}
          <ellipse cx="35" cy="16" rx="24" ry="7" fill="#84cc16" stroke="#eab308" strokeWidth="1.5" />
          <ellipse cx="35" cy="16" rx="20" ry="5" fill="#a3e635" opacity="0.6" />
          {/* Piyoladagi paxtagul naqshi */}
          <path d="M35 25 C30 32, 30 38, 35 44 C40 38, 40 32, 35 25 Z" fill="#ffffff" />
          {/* Taglik */}
          <ellipse cx="35" cy="49" rx="12" ry="3" fill="#0f172a" />
        </svg>
      </div>
    </div>
  );
};
