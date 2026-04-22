import { ExternalLink } from "lucide-react";

import { Avatar } from "../common";
import type { MentorProfile } from "./types";
import { openExternal } from "./types";

interface MentorHeaderProps {
  mentor: MentorProfile;
  onPhotoClick?: () => void;
  projectsCount: number;
}

export function MentorHeader({ mentor, onPhotoClick, projectsCount }: MentorHeaderProps) {
  const telegramLink = mentor.telegram?.startsWith("@")
    ? `https://t.me/${mentor.telegram.slice(1)}`
    : undefined;

  const photoNode = mentor.photo ? (
    <img src={mentor.photo} alt={mentor.name} className="w-full h-full object-cover object-top" />
  ) : (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "var(--bg-subtle)" }}
    >
      <Avatar name={mentor.name} size={72} />
    </div>
  );

  return (
    <div className="flex gap-4 sm:gap-5 p-5 sm:p-6">
      <button
        type="button"
        onClick={onPhotoClick}
        aria-label={`Открыть фото ментора ${mentor.name}`}
        className="shrink-0 overflow-hidden transition-transform hover:scale-[1.02]"
        style={{
          width: 80,
          height: 80,
          borderRadius: "var(--radius-md)",
          background: "var(--bg-subtle)",
        }}
      >
        {photoNode}
      </button>

      <div className="flex-1 min-w-0 pt-0.5">
        <p
          className="text-[10px] uppercase tracking-wider mb-1"
          style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
        >
          Ментор · {projectsCount}{" "}
          {projectsCount === 1 ? "проект" : projectsCount < 5 ? "проекта" : "проектов"}
        </p>
        <p
          className="text-[16px] leading-tight mb-1"
          style={{ color: "var(--text-primary)", fontWeight: 600 }}
        >
          {mentor.name}
        </p>
        {mentor.position && (
          <p className="text-[13px] leading-snug mb-2" style={{ color: "var(--text-secondary)" }}>
            {mentor.position}
          </p>
        )}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {mentor.city && <span>{mentor.city}</span>}
          {mentor.telegram && (
            <>
              {mentor.city && <span aria-hidden="true">·</span>}
              {telegramLink ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openExternal(telegramLink);
                  }}
                  className="inline-flex items-center gap-1 transition-opacity hover:opacity-80"
                  style={{ color: "var(--info)" }}
                >
                  {mentor.telegram}
                  <ExternalLink size={11} />
                </button>
              ) : (
                <span>{mentor.telegram}</span>
              )}
            </>
          )}
          {mentor.workFormat && (
            <>
              {(mentor.city || mentor.telegram) && <span aria-hidden="true">·</span>}
              <span>{mentor.workFormat}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
