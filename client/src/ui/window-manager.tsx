"use client"

import { X } from "lucide-react"
import { useState, useRef, useEffect, ReactNode } from "react"

interface WindowManagerProps {
  title: string
  onClose: () => void
  children: ReactNode
  windowId: string // Unique ID for persisting position
  width?: number | string
  minWidth?: number
  minHeight?: number
  maxHeight?: number | string
}

// Store window positions in memory (could be moved to localStorage later)
const windowPositions = new Map<string, { x: number; y: number }>()

export function WindowManager({
  title,
  onClose,
  children,
  windowId,
  width = 400,
  minWidth = 300,
  minHeight = 200,
  maxHeight = "80vh",
}: WindowManagerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize position on mount
  useEffect(() => {
    if (isInitialized || !windowRef.current) return

    // Check if we have a saved position for this window
    const savedPosition = windowPositions.get(windowId)

    if (savedPosition) {
      // Use saved position if it exists
      setPosition(savedPosition)
      setIsInitialized(true)
    } else {
      // Center the window on first open - use a timeout to ensure DOM is fully rendered
      const initializePosition = () => {
        if (!windowRef.current) return

        const windowWidth = windowRef.current.offsetWidth
        const windowHeight = windowRef.current.offsetHeight
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Center the window
        const x = Math.max(0, (viewportWidth - windowWidth) / 2)
        const y = Math.max(0, (viewportHeight - windowHeight) / 2)

        setPosition({ x, y })
        setIsInitialized(true)
      }

      // Try to initialize immediately, but also after a short delay to ensure proper sizing
      initializePosition()
      const timeoutId = setTimeout(initializePosition, 10)

      return () => clearTimeout(timeoutId)
    }
  }, [isInitialized, windowId])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!windowRef.current) return

    // Get the current position from the element's style
    const currentX = position.x
    const currentY = position.y

    // Calculate offset from mouse to window's top-left corner
    setDragOffset({
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    })
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!windowRef.current) return

      // Calculate new position using the stored offset
      let newX = e.clientX - dragOffset.x
      let newY = e.clientY - dragOffset.y

      // Get window dimensions
      const windowWidth = windowRef.current.offsetWidth
      const windowHeight = windowRef.current.offsetHeight
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Constrain to viewport bounds
      newX = Math.max(0, Math.min(newX, viewportWidth - windowWidth))
      newY = Math.max(0, Math.min(newY, viewportHeight - windowHeight))

      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset])

  // Save position when it changes
  useEffect(() => {
    if (!isInitialized) return
    windowPositions.set(windowId, position)
  }, [position, windowId, isInitialized])

  // Keep window on screen when viewport resizes
  useEffect(() => {
    const handleResize = () => {
      if (!windowRef.current || !isInitialized) return

      const windowWidth = windowRef.current.offsetWidth
      const windowHeight = windowRef.current.offsetHeight
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      setPosition((prev) => ({
        x: Math.max(0, Math.min(prev.x, viewportWidth - windowWidth)),
        y: Math.max(0, Math.min(prev.y, viewportHeight - windowHeight)),
      }))
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isInitialized])

  const widthStyle = typeof width === "number" ? `${width}px` : width
  const maxHeightStyle = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight

  return (
    <div
      ref={windowRef}
      className="absolute bg-card/95 border-2 border-border rounded-lg backdrop-blur-sm shadow-xl flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: widthStyle,
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`,
        maxHeight: maxHeightStyle,
        opacity: isInitialized ? 1 : 0,
        transition: isInitialized ? "none" : "opacity 0.1s",
        zIndex: 1000,
      }}
    >
      {/* Title Bar */}
      <div
        className="flex items-center justify-between p-3 border-b border-border cursor-grab active:cursor-grabbing select-none shrink-0"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <h2 className="text-foreground font-semibold">{title}</h2>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto overflow-x-hidden flex-1">{children}</div>
    </div>
  )
}
