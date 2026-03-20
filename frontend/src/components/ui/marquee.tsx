"use client";

import { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  speed?: "slow" | "normal" | "fast";
  className?: string;
}

export function Marquee({ children, speed = "normal", className = "" }: MarqueeProps) {
  const speedClass = {
    slow: "duration-[60s]",
    normal: "duration-[40s]",
    fast: "duration-[20s]",
  }[speed];

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div className={`inline-flex animate-marquee ${speedClass}`}>
        <div className="flex items-center">
          {children}
        </div>
        <div className="flex items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
