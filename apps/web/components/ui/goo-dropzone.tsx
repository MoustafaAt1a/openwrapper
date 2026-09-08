"use client"

import { Upload } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface GooDropzoneProps {
  onFiles?: (files: File[]) => void
  accept?: string
  maxSizeMb?: number
  className?: string
  children?: React.ReactNode
}

/**
 * GooDropzone — Drag-and-drop upload area with metaball merge physics.
 *
 * When files are dragged over, the drop zone border morphs with liquid
 * blob pulses. On drop, the visual merges with a satisfying goo animation.
 */
export function GooDropzone({
  onFiles,
  accept,
  maxSizeMb = 5,
  className,
  children,
}: GooDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const [dropped, setDropped] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const processFiles = useCallback(
    (fileList: FileList) => {
      const maxBytes = maxSizeMb * 1024 * 1024
      const valid = Array.from(fileList).filter((f) => f.size <= maxBytes)
      setFiles(valid)
      setDropped(true)
      setDragging(false)
      dragCounter.current = 0
      onFiles?.(valid)
      setTimeout(() => setDropped(false), 600)
    },
    [maxSizeMb, onFiles],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [processFiles],
  )

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
      }
    },
    [processFiles],
  )

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group",
        dragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : dropped
            ? "border-primary/60 bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/30",
        className,
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleClick()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Drop files here or click to upload"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileInput}
        className="hidden"
        tabIndex={-1}
      />

      {/* Goo merge blobs — visible during drag */}
      <div
        className={cn(
          "absolute inset-0 goo-light overflow-hidden rounded-2xl pointer-events-none",
          dragging ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-16 rounded-full bg-primary/20 animate-[goo-pulse_1s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 left-1/3 size-10 rounded-full bg-primary/15 animate-[goo-pulse_1s_ease-in-out_0.3s_infinite]" />
        <div className="absolute bottom-1/3 right-1/3 size-12 rounded-full bg-primary/15 animate-[goo-pulse_1s_ease-in-out_0.6s_infinite]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-6 text-center">
        {children || (
          <>
            <div
              className={cn(
                "flex items-center justify-center size-10 rounded-xl bg-muted/60 text-muted-foreground transition-all duration-300",
                dragging && "bg-primary/15 text-primary scale-110",
                dropped && "bg-primary/15 text-primary animate-[goo-pop_0.4s_ease-out]",
              )}
            >
              <Upload className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {dragging ? "Drop to upload" : "Drag & drop files here"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                or click to browse · max {maxSizeMb}MB
              </p>
            </div>
          </>
        )}

        {/* Uploaded file list */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {files.map((f) => (
              <span
                key={f.name}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary animate-[goo-pop_0.3s_ease-out]"
              >
                {f.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
