"use client"

import { useState, useEffect } from "react"

interface ChatBubbleProps {
  playerName: string
  message: string
  duration?: number
  position?: { top: number; left: number }
}

export function ChatBubble({
  playerName,
  message,
  duration = 5000,
  position = { top: 150, left: 200 },
}: ChatBubbleProps) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), duration - 500)
    return () => clearTimeout(timer)
  }, [duration])

  return (
    <div
      className={`absolute pointer-events-none transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Chat Bubble */}
      <div className="relative">
        {/* Main bubble */}
        <div className="bg-card/95 border-2 border-primary rounded-lg px-4 py-2 backdrop-blur-sm max-w-xs">
          <p className="text-foreground text-sm font-medium leading-relaxed text-pretty">{message}</p>
        </div>
        {/* Tail pointer */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary" />
      </div>
    </div>
  )
}
