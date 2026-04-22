import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import type { Story } from "../lib/domain";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

interface StoryViewerProps {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

const DURATION = 6000;

export function StoryViewer({ stories, startIndex, onClose, onMarkRead }: StoryViewerProps) {
  const [storyIdx, setStoryIdx] = useState(startIndex);
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  useBodyScrollLock(true);

  const story = stories[storyIdx];
  const slide = story?.slides[slideIdx];

  const goNext = useCallback(() => {
    if (!story) return;
    if (slideIdx < story.slides.length - 1) {
      setSlideIdx((s) => s + 1);
    } else if (storyIdx < stories.length - 1) {
      setStoryIdx((s) => s + 1);
      setSlideIdx(0);
    } else {
      onClose();
    }
  }, [slideIdx, storyIdx, story, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx((s) => s - 1);
    } else if (storyIdx > 0) {
      setStoryIdx((s) => s - 1);
      setSlideIdx(0);
    }
  }, [slideIdx, storyIdx]);

  // Отмечаем сторис прочитанным при её открытии.
  useEffect(() => {
    if (story) onMarkRead(story.id);
  }, [onMarkRead, story]);

  // Таймер слайда: сбрасывает прогресс и автопереходит дальше по истечении DURATION.
  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / DURATION, 1));
      if (elapsed >= DURATION) {
        clearInterval(timer);
        goNext();
      }
    }, 30);
    return () => clearInterval(timer);
  }, [storyIdx, slideIdx, goNext]);

  if (!story || !slide) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "var(--text-primary)" }}
    >
      {/* Background image — subtle, documentary */}
      <img
        src={slide.image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.35 }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(26,26,26,0.7) 0%, rgba(26,26,26,0.3) 40%, rgba(26,26,26,0.85) 100%)",
        }}
      />

      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10">
        {story.slides.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: "rgba(255,255,255,0.8)",
                width: `${i < slideIdx ? 100 : i === slideIdx ? progress * 100 : 0}%`,
                transition: "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-10 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full"
        style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
      >
        <X size={22} />
      </button>

      {/* Tap zones */}
      <div className="absolute inset-0 flex z-[5]">
        <div className="w-1/3 h-full" onClick={goPrev} />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" onClick={goNext} />
      </div>

      {/* Content — service-format, large type */}
      <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
        <p
          className="text-[12px] tracking-widest uppercase mb-3"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {story.type === "urgent"
            ? "Важное"
            : story.type === "navigation"
              ? "Навигация"
              : story.type === "project"
                ? "Проекты"
                : "Информация"}
        </p>
        <h2 className="text-[26px] text-white mb-3" style={{ fontWeight: 600, lineHeight: 1.2 }}>
          {slide.text}
        </h2>
        {slide.caption && (
          <p className="text-[16px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            {slide.caption}
          </p>
        )}
      </div>
    </div>
  );
}
