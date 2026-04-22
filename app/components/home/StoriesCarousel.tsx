import type { Story } from "../../lib/domain";
import { ActionIconButton } from "../admin-ui";

interface StoriesCarouselProps {
  stories: Story[];
  readStories: Set<string>;
  canManageStories: boolean;
  onOpenStory: (index: number) => void;
  onCreateStory: () => void;
  onEditStory: (story: Story) => void;
  onDeleteStory: (story: Story) => void;
  onToggleStoryHidden: (story: Story) => void;
}

export function StoriesCarousel({
  stories,
  readStories,
  canManageStories,
  onOpenStory,
  onCreateStory,
  onEditStory,
  onDeleteStory,
  onToggleStoryHidden,
}: StoriesCarouselProps) {
  if (stories.length === 0) return null;

  return (
    <div className="px-5 pb-5">
      {canManageStories && (
        <div className="flex justify-end mb-2">
          <ActionIconButton
            kind="plus"
            label="Создать сторис"
            onClick={(event) => {
              event.preventDefault();
              onCreateStory();
            }}
          />
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {stories.map((story, index) => (
          <div
            key={story.id}
            className="relative shrink-0"
            style={{ opacity: story.isHidden ? 0.5 : 1 }}
          >
            {canManageStories && (
              <>
                <ActionIconButton
                  kind="edit"
                  label={`Редактировать ${story.title}`}
                  className="absolute -top-1 -right-1 z-10"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onEditStory(story);
                  }}
                />
                <ActionIconButton
                  kind="delete"
                  label={`Удалить ${story.title}`}
                  className="absolute -bottom-1 -right-1 z-10"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (window.confirm(`Удалить сторис «${story.title}»?`)) {
                      onDeleteStory(story);
                    }
                  }}
                />
                <ActionIconButton
                  kind={story.isHidden ? "show" : "hide"}
                  label={story.isHidden ? "Показать участникам" : "Скрыть от участников"}
                  className="absolute -bottom-1 -left-1 z-10"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleStoryHidden(story);
                  }}
                />
              </>
            )}
            <button
              onClick={() => onOpenStory(index)}
              className="flex flex-col items-center gap-1.5 w-[68px]"
            >
              <div
                className="w-[62px] h-[62px] rounded-full p-[2px]"
                style={{
                  background: readStories.has(story.id)
                    ? "var(--line-subtle)"
                    : "linear-gradient(135deg, var(--accent-peach-warm), var(--accent-violet))",
                }}
              >
                <img
                  src={story.image}
                  alt=""
                  className="w-full h-full rounded-full object-cover border-2 border-white"
                />
              </div>
              <span
                className="text-[11px] text-center leading-tight line-clamp-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {story.title}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
