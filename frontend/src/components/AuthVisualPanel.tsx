'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  quote: string;
  sub: string;
}

const SLIDES: Slide[] = [
  {
    quote: 'Stay Online. Stay Ahead.',
    sub: 'Finally, all your website monitoring in one place.',
  },
  {
    quote: 'Zero Downtime. Zero Surprises.',
    sub: 'Instant alerts via Discord, Email & Webhooks before users notice.',
  },
  {
    quote: 'Speed Matters. Millisecond Precision.',
    sub: 'Real-time uptime, speed and SSL monitoring at your fingertips.',
  },
];

export default function AuthVisualPanel() {
  const [current, setCurrent] = useState(0);

  // Auto-advance quote every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
  };

  return (
    <div className="relative w-full h-full min-h-[500px] lg:min-h-[600px] rounded-[24px] lg:rounded-[28px] overflow-hidden flex flex-col justify-end p-8 select-none shadow-inner">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out scale-105"
        style={{
          backgroundImage: "url('/auth-visual.jpg')",
        }}
      />

      {/* Atmospheric gradient overlay for optimal text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5 pointer-events-none" />

      {/* Slide Content */}
      <div className="relative z-10 text-white max-w-md">
        <div key={current} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-md text-white mb-2 leading-snug">
            {SLIDES[current].quote}
          </h2>
          <p className="text-sm sm:text-base text-zinc-200/90 font-normal drop-shadow-sm mb-6 leading-relaxed">
            {SLIDES[current].sub}
          </p>
        </div>

        {/* Navigation Controls: Circular buttons and indicators matching the reference */}
        <div className="flex items-center space-x-3 pt-1">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous quote"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 active:scale-95 backdrop-blur-md border border-white/30 flex items-center justify-center text-white transition cursor-pointer shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next quote"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 active:scale-95 backdrop-blur-md border border-white/30 flex items-center justify-center text-white transition cursor-pointer shadow-sm"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Dots */}
          <div className="flex items-center space-x-1.5 ml-2">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrent(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === current ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
