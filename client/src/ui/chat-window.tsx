"use client"

import { useState, useRef, useEffect } from "react"
import { useChatStore } from "../stores"
import { ChatMode } from "../../../shared/messages"

interface ChatWindowProps {
  onSendMessage?: (message: string, mode: ChatMode) => void
}

export function ChatWindow({ onSendMessage }: ChatWindowProps) {
  const { messages } = useChatStore()
  const [inputValue, setInputValue] = useState("")
  const [currentMode, setCurrentMode] = useState<ChatMode>(() => {
    // Load last used mode from localStorage, default to "say"
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('chat-mode') as ChatMode) || "say"
    }
    return "say"
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!inputValue.trim() || !onSendMessage) return;

    let message = inputValue.trim();
    let mode = currentMode;

    // Parse chat commands
    if (message.startsWith('/')) {
      const commandMatch = message.match(/^\/(say|guild|party|global)\s*(.*)/i);
      if (commandMatch) {
        mode = commandMatch[1].toLowerCase() as ChatMode;
        message = commandMatch[2];
        // Update current mode and save to localStorage
        setCurrentMode(mode);
        localStorage.setItem('chat-mode', mode);
      } else {
        // Unknown command, send as regular message
        message = message;
      }
    }

    if (message) {
      onSendMessage(message, mode);
      setInputValue("");
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="w-96 h-52 bg-card/60 border-2 border-border rounded-lg backdrop-blur-sm flex flex-col">
      {/* Chat Header */}
      <div className="p-2 border-b border-border/50">
        <h3 className="text-foreground font-semibold text-sm text-center">Chat</h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.map((msg, index) => (
          <div key={`${msg.playerId}-${msg.timestamp}-${index}`} className="text-xs">
            <span className="text-accent font-medium">[{formatTime(msg.timestamp)}]</span>
            <span className={`text-xs px-1 rounded font-medium ${msg.mode === 'say' ? 'text-green-400 bg-green-400/10' :
              msg.mode === 'guild' ? 'text-blue-400 bg-blue-400/10' :
                msg.mode === 'party' ? 'text-purple-400 bg-purple-400/10' :
                  'text-yellow-400 bg-yellow-400/10'
              }`}>
              {msg.mode.toUpperCase()}
            </span>
            <span className="text-primary font-medium ml-1">{msg.playerName}:</span>
            <span className="text-foreground ml-1">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 border-t border-border/50">
        <div className="flex gap-1">
          <select
            value={currentMode}
            onChange={(e) => {
              const newMode = e.target.value as ChatMode
              setCurrentMode(newMode)
              localStorage.setItem('chat-mode', newMode)
            }}
            className="px-2 py-1 bg-secondary/50 border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary"
          >
            <option value="say">Say</option>
            <option value="guild">Guild</option>
            <option value="party">Party</option>
            <option value="global">Global</option>
          </select>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-2 py-1 bg-secondary/50 border border-border rounded text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
