"use client";
import { useRef, ReactNode, MouseEvent } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  intensity?: number; // degrees of tilt, default 10
  glare?: boolean;
}

export function TiltCard({ children, className = "", style, intensity = 10, glare = true }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;   // -0.5 to 0.5
    const y = (e.clientY - top) / height - 0.5;    // -0.5 to 0.5

    card.style.transform = `perspective(900px) rotateY(${x * intensity}deg) rotateX(${y * -intensity}deg) scale3d(1.03, 1.03, 1.03)`;

    if (glare && glareRef.current) {
      const glareX = (e.clientX - left) / width * 100;
      const glareY = (e.clientY - top) / height * 100;
      glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.12) 0%, transparent 70%)`;
      glareRef.current.style.opacity = "1";
    }
  }

  function onMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)";
    if (glare && glareRef.current) {
      glareRef.current.style.opacity = "0";
    }
  }

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      style={{ ...style, transition: "transform 0.4s cubic-bezier(.03,.98,.52,.99)", transformStyle: "preserve-3d", willChange: "transform" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{ opacity: 0, zIndex: 10 }}
        />
      )}
    </div>
  );
}
