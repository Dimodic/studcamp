import { useState } from "react";
import { useNavigate } from "react-router";
import { Building, CreditCard, FileText, FolderOpen } from "lucide-react";

import { StoryViewer } from "../story-viewer";
import { PageShell } from "../common";
import { useAppData } from "../../lib/app-data";
import { AdminEditorModal, ADMIN_PATHS, type AdminEntityKind } from "../admin-ui";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { openExternal } from "./helpers";
import type { QuickLink } from "./types";
import { HomePageHeader } from "./HomePageHeader";
import { StoriesCarousel } from "./StoriesCarousel";
import { NextEventCard } from "./NextEventCard";
import { UpcomingEventRow } from "./UpcomingEventRow";
import { DeadlineCard } from "./DeadlineCard";
import { DayEventsSnippet } from "./DayEventsSnippet";
import { QuickLinksGrid } from "./QuickLinksGrid";
import { OrgUpdatesList } from "./OrgUpdatesList";
import { NotificationsOverlay } from "./NotificationsOverlay";

export function HomePage() {
  const navigate = useNavigate();
  const {
    data,
    markStoryRead,
    markUpdatesRead,
    createAdminEntity,
    updateAdminEntity,
    deleteAdminEntity,
    setEntityVisibility,
  } = useAppData();
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [adminState, setAdminState] = useState<{
    kind: AdminEntityKind;
    mode: "create" | "edit";
    entity?: unknown;
  } | null>(null);
  useBodyScrollLock(showNotifications);

  if (!data) return null;

  const { camp, events, stories, orgUpdates: updates, documents, currentUser } = data;
  const inProgressEvent = events.find((event) => event.status === "in_progress");
  const firstUpcoming = events.find((event) => event.status === "upcoming");
  const nextEvent = inProgressEvent ?? firstUpcoming;
  const upcomingAfterCurrent = inProgressEvent ? firstUpcoming : null;
  const todayEvents = events.filter((event) => event.day === data.ui.currentDay);
  const readStories = new Set(stories.filter((story) => story.read).map((story) => story.id));
  const unreadCount = updates.filter((update) => !update.isRead).length;
  const nearestDeadline = documents
    .filter((document) => document.status !== "done" && document.deadline)
    .sort((left, right) => (left.deadline! > right.deadline! ? 1 : -1))[0];
  const canEditCamp = currentUser.capabilities.canManageAll;

  const openNotifications = () => {
    setShowNotifications(true);
    void markUpdatesRead(updates.filter((update) => !update.isRead).map((update) => update.id));
  };

  const openRoute = (eventAddress: string, fallbackPlace: string) => {
    const query = eventAddress || fallbackPlace;
    if (!query) return;
    openExternal(`https://yandex.ru/maps/?text=${encodeURIComponent(query)}`);
  };

  const quickLinks: QuickLink[] = [
    {
      icon: CreditCard,
      label: "Бейдж",
      description: "QR-код участника",
      accent: "var(--accent-blue)",
      onClick: () => navigate("/profile/badge"),
    },
    {
      icon: FileText,
      label: "Документы",
      description: "Заявления и анкеты",
      accent: "var(--accent-lilac)",
      onClick: () => navigate("/documents"),
    },
    {
      icon: FolderOpen,
      label: "Материалы",
      description: "Записи и презентации",
      accent: "var(--accent-teal)",
      onClick: () => navigate("/materials"),
    },
    {
      icon: Building,
      label: "Кампус",
      description: "Проживание и связь",
      accent: "var(--accent-violet)",
      onClick: () => navigate("/campus"),
    },
  ];

  return (
    <PageShell size="wide">
      <HomePageHeader
        camp={camp}
        currentDay={data.ui.currentDay}
        totalDays={data.ui.totalDays}
        unreadCount={unreadCount}
        canEditCamp={canEditCamp}
        onEditCamp={() => setAdminState({ kind: "camp", mode: "edit", entity: camp })}
        onOpenNotifications={openNotifications}
      />

      <StoriesCarousel
        stories={stories}
        readStories={readStories}
        canManageStories={currentUser.capabilities.canManageStories}
        onOpenStory={(index) => setActiveStoryIndex(index)}
        onCreateStory={() => setAdminState({ kind: "story", mode: "create" })}
        onEditStory={(story) => setAdminState({ kind: "story", mode: "edit", entity: story })}
        onDeleteStory={(story) => void deleteAdminEntity("stories", story.id)}
        onToggleStoryHidden={(story) =>
          void setEntityVisibility("stories", story.id, !story.isHidden)
        }
      />

      <div className="px-5 pb-8 xl:grid xl:grid-cols-[minmax(0,1.7fr)_320px] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-4">
          {nextEvent && (
            <NextEventCard
              event={nextEvent}
              onOpenRoute={openRoute}
              onOpenBadge={() => navigate("/profile/badge")}
            />
          )}

          {upcomingAfterCurrent && (
            <UpcomingEventRow
              event={upcomingAfterCurrent}
              onOpen={(event) => navigate(`/schedule?event=${event.id}`)}
            />
          )}

          {nearestDeadline && (
            <DeadlineCard deadline={nearestDeadline} onOpen={() => navigate("/documents")} />
          )}

          <DayEventsSnippet
            events={todayEvents}
            currentUser={currentUser}
            onOpenEvent={(event) => navigate(`/schedule?event=${event.id}`)}
            onOpenSchedule={() => navigate("/schedule")}
          />
        </div>

        <div className="hidden xl:flex xl:flex-col gap-4 mt-6 xl:mt-0">
          <QuickLinksGrid links={quickLinks} />
          <OrgUpdatesList updates={updates} onOpenNotifications={openNotifications} />
        </div>
      </div>

      {activeStoryIndex !== null && (
        <StoryViewer
          stories={stories}
          startIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
          onMarkRead={(storyId) => void markStoryRead(storyId)}
        />
      )}

      {showNotifications && (
        <NotificationsOverlay
          updates={updates}
          currentUser={currentUser}
          onClose={() => setShowNotifications(false)}
          onCreateUpdate={() => setAdminState({ kind: "orgUpdate", mode: "create" })}
          onEditUpdate={(update) =>
            setAdminState({ kind: "orgUpdate", mode: "edit", entity: update })
          }
          onToggleHidden={(update) =>
            void setEntityVisibility("org-updates", update.id, !update.isHidden)
          }
          onDeleteUpdate={(update) => void deleteAdminEntity("org-updates", update.id)}
        />
      )}

      <AdminEditorModal
        open={adminState !== null}
        kind={adminState?.kind ?? null}
        mode={adminState?.mode ?? "create"}
        entity={adminState?.entity}
        onClose={() => setAdminState(null)}
        onSubmit={async (payload) => {
          if (!adminState) return;
          const resource = ADMIN_PATHS[adminState.kind];
          if (adminState.mode === "create") {
            await createAdminEntity(resource, payload);
            return;
          }
          await updateAdminEntity(resource, (adminState.entity as { id: string }).id, payload);
        }}
      />
    </PageShell>
  );
}
