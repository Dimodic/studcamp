import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

import type {
  AdminDocument,
  AdminRoomAssignment,
  AdminUser,
  Camp,
  CampusCategory,
  Event,
  Material,
  OrgUpdate,
  Project,
  Resource,
  Story,
} from "../../lib/domain";
import { PrimaryButton, SecondaryButton } from "../common";
import {
  buildStoryInitial,
  serializeStory,
  StoryForm,
  type StoryFormState,
} from "./forms/StoryForm";
import {
  buildOrgUpdateInitial,
  OrgUpdateForm,
  serializeOrgUpdate,
  type OrgUpdateFormState,
} from "./forms/OrgUpdateForm";
import {
  buildEventInitial,
  EventForm,
  serializeEvent,
  type EventFormState,
} from "./forms/EventForm";
import { buildUserInitial, serializeUser, UserForm, type UserFormState } from "./forms/UserForm";
import {
  buildProjectInitial,
  ProjectForm,
  serializeProject,
  type ProjectFormState,
} from "./forms/ProjectForm";
import {
  buildMaterialInitial,
  MaterialForm,
  serializeMaterial,
  type MaterialFormState,
} from "./forms/MaterialForm";
import {
  buildResourceInitial,
  ResourceForm,
  serializeResource,
  type ResourceFormState,
} from "./forms/ResourceForm";
import {
  buildCampusCategoryInitial,
  CampusCategoryForm,
  serializeCampusCategory,
  type CampusCategoryFormState,
} from "./forms/CampusCategoryForm";
import {
  buildRoomAssignmentInitial,
  RoomAssignmentForm,
  serializeRoomAssignment,
  type RoomAssignmentFormState,
} from "./forms/RoomAssignmentForm";
import {
  buildDocumentInitial,
  DocumentForm,
  serializeDocument,
  type DocumentFormState,
} from "./forms/DocumentForm";
import { buildCampInitial, CampForm, serializeCamp, type CampFormState } from "./forms/CampForm";
import type { AdminEntityKind, AdminOption } from "./paths";
import { editorTitle } from "./paths";

type AdminEntity =
  | Story
  | OrgUpdate
  | Event
  | AdminUser
  | Project
  | Material
  | Resource
  | CampusCategory
  | AdminRoomAssignment
  | AdminDocument
  | Camp;

type FormState =
  | StoryFormState
  | OrgUpdateFormState
  | EventFormState
  | UserFormState
  | ProjectFormState
  | MaterialFormState
  | ResourceFormState
  | CampusCategoryFormState
  | RoomAssignmentFormState
  | DocumentFormState
  | CampFormState;

interface AdminEditorModalProps {
  open: boolean;
  kind: AdminEntityKind | null;
  mode: "create" | "edit";
  entity?: unknown;
  defaults?: Partial<EventFormState>;
  title?: string;
  allowTeacherAssignment?: boolean;
  eventOptions?: AdminOption[];
  teacherOptions?: AdminOption[];
  userOptions?: AdminOption[];
  onClose: () => void;
  onSubmit: (payload: unknown) => Promise<void>;
}

function buildInitialState(
  kind: AdminEntityKind,
  entity: unknown,
  defaults: Partial<EventFormState> | undefined,
): FormState {
  const typed = entity as AdminEntity | undefined;
  switch (kind) {
    case "story":
      return buildStoryInitial(typed as Partial<Story> | undefined);
    case "orgUpdate":
      return buildOrgUpdateInitial(typed as Partial<OrgUpdate> | undefined);
    case "event":
      return buildEventInitial(typed as Partial<Event> | undefined, defaults);
    case "user":
      return buildUserInitial(typed as Partial<AdminUser> | undefined);
    case "project":
      return buildProjectInitial(typed as Partial<Project> | undefined);
    case "material":
      return buildMaterialInitial(typed as Partial<Material> | undefined);
    case "resource":
      return buildResourceInitial(typed as Partial<Resource> | undefined);
    case "campusCategory":
      return buildCampusCategoryInitial(typed as Partial<CampusCategory> | undefined);
    case "roomAssignment":
      return buildRoomAssignmentInitial(typed as Partial<AdminRoomAssignment> | undefined);
    case "document":
      return buildDocumentInitial(typed as Partial<AdminDocument> | undefined);
    case "camp":
      return buildCampInitial(typed as Partial<Camp> | undefined);
  }
}

function serializeFormState(kind: AdminEntityKind, state: FormState): unknown {
  switch (kind) {
    case "story":
      return serializeStory(state as StoryFormState);
    case "orgUpdate":
      return serializeOrgUpdate(state as OrgUpdateFormState);
    case "event":
      return serializeEvent(state as EventFormState);
    case "user":
      return serializeUser(state as UserFormState);
    case "project":
      return serializeProject(state as ProjectFormState);
    case "material":
      return serializeMaterial(state as MaterialFormState);
    case "resource":
      return serializeResource(state as ResourceFormState);
    case "campusCategory":
      return serializeCampusCategory(state as CampusCategoryFormState);
    case "roomAssignment":
      return serializeRoomAssignment(state as RoomAssignmentFormState);
    case "document":
      return serializeDocument(state as DocumentFormState);
    case "camp":
      return serializeCamp(state as CampFormState);
  }
}

export function AdminEditorModal({
  open,
  kind,
  mode,
  entity,
  defaults,
  title,
  allowTeacherAssignment = false,
  eventOptions = [],
  teacherOptions = [],
  userOptions = [],
  onClose,
  onSubmit,
}: AdminEditorModalProps) {
  const [state, setState] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && kind) {
      setState(buildInitialState(kind, entity, defaults));
      setError("");
    }
  }, [defaults, entity, kind, open]);

  useBodyScrollLock(open);

  const modalTitle = useMemo(() => {
    if (!kind) {
      return "";
    }
    return title ?? editorTitle(kind, mode);
  }, [kind, mode, title]);

  if (!open || !kind || !state) {
    return null;
  }

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await onSubmit(serializeFormState(kind, state));
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-xl)] border max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
        >
          <h2 className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {kind === "story" && <StoryForm state={state as StoryFormState} onChange={setState} />}
          {kind === "orgUpdate" && (
            <OrgUpdateForm state={state as OrgUpdateFormState} onChange={setState} />
          )}
          {kind === "event" && (
            <EventForm
              state={state as EventFormState}
              onChange={setState}
              allowTeacherAssignment={allowTeacherAssignment}
              teacherOptions={teacherOptions}
            />
          )}
          {kind === "user" && (
            <UserForm state={state as UserFormState} onChange={setState} mode={mode} />
          )}
          {kind === "project" && (
            <ProjectForm state={state as ProjectFormState} onChange={setState} />
          )}
          {kind === "material" && (
            <MaterialForm
              state={state as MaterialFormState}
              onChange={setState}
              eventOptions={eventOptions}
            />
          )}
          {kind === "resource" && (
            <ResourceForm
              state={state as ResourceFormState}
              onChange={setState}
              eventOptions={eventOptions}
            />
          )}
          {kind === "campusCategory" && (
            <CampusCategoryForm state={state as CampusCategoryFormState} onChange={setState} />
          )}
          {kind === "roomAssignment" && (
            <RoomAssignmentForm
              state={state as RoomAssignmentFormState}
              onChange={setState}
              userOptions={userOptions}
            />
          )}
          {kind === "document" && (
            <DocumentForm
              state={state as DocumentFormState}
              onChange={setState}
              userOptions={userOptions}
            />
          )}
          {kind === "camp" && <CampForm state={state as CampFormState} onChange={setState} />}

          {error && (
            <p className="text-[13px]" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
        </div>

        <div
          className="px-5 py-4 border-t flex gap-3"
          style={{ borderColor: "var(--line-subtle)" }}
        >
          <SecondaryButton className="flex-1" onClick={onClose}>
            Отмена
          </SecondaryButton>
          <PrimaryButton className="flex-1" onClick={() => void submit()} disabled={saving}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
