import type { Project } from "../../../lib/domain";
import { emptyToNull, toNumberOrFallback } from "../serializers";
import { TextField } from "../form-primitives";

export interface ProjectFormState {
  title: string;
  shortDescription: string;
  description: string;
  direction: string;
  minTeam: number | string;
  maxTeam: number | string;
  mentorName: string;
  mentorPosition: string;
  mentorCity: string;
  mentorTelegram: string;
  mentorPhoto: string;
  mentorWorkFormat: string;
}

export function buildProjectInitial(entity?: Partial<Project>): ProjectFormState {
  return {
    title: entity?.title ?? "",
    shortDescription: entity?.shortDescription ?? "",
    description: entity?.description ?? "",
    direction: entity?.direction ?? "",
    minTeam: entity?.minTeam ?? 1,
    maxTeam: entity?.maxTeam ?? 1,
    mentorName: entity?.mentorName ?? "",
    mentorPosition: entity?.mentorPosition ?? "",
    mentorCity: entity?.mentorCity ?? "",
    mentorTelegram: entity?.mentorTelegram ?? "",
    mentorPhoto: entity?.mentorPhoto ?? "",
    mentorWorkFormat: entity?.mentorWorkFormat ?? "",
  };
}

export function serializeProject(state: ProjectFormState) {
  return {
    title: state.title,
    shortDescription: state.shortDescription,
    description: emptyToNull(state.description),
    direction: state.direction,
    minTeam: toNumberOrFallback(state.minTeam, 1),
    maxTeam: toNumberOrFallback(state.maxTeam, 1),
    mentorName: emptyToNull(state.mentorName),
    mentorPosition: emptyToNull(state.mentorPosition),
    mentorCity: emptyToNull(state.mentorCity),
    mentorTelegram: emptyToNull(state.mentorTelegram),
    mentorPhoto: emptyToNull(state.mentorPhoto),
    mentorWorkFormat: emptyToNull(state.mentorWorkFormat),
  };
}

interface ProjectFormProps {
  state: ProjectFormState;
  onChange: (next: ProjectFormState) => void;
}

export function ProjectForm({ state, onChange }: ProjectFormProps) {
  return (
    <>
      <TextField label="Название" value={state.title} onChange={(value) => onChange({ ...state, title: value })} />
      <TextField
        label="Краткое описание"
        value={state.shortDescription}
        multiline
        onChange={(value) => onChange({ ...state, shortDescription: value })}
      />
      <TextField
        label="Полное описание"
        value={state.description}
        multiline
        onChange={(value) => onChange({ ...state, description: value })}
        placeholder="Абзацы разделяйте пустой строкой"
      />
      <TextField label="Направление" value={state.direction} onChange={(value) => onChange({ ...state, direction: value })} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Мин. команда" type="number" value={state.minTeam} onChange={(value) => onChange({ ...state, minTeam: value })} />
        <TextField label="Макс. команда" type="number" value={state.maxTeam} onChange={(value) => onChange({ ...state, maxTeam: value })} />
      </div>

      <div
        className="rounded-[var(--radius-md)] border p-4 space-y-3"
        style={{ borderColor: "var(--line-subtle)" }}
      >
        <p className="text-[12px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
          Ментор
        </p>
        <TextField label="Имя ментора" value={state.mentorName} onChange={(value) => onChange({ ...state, mentorName: value })} />
        <TextField
          label="Должность и компания"
          value={state.mentorPosition}
          onChange={(value) => onChange({ ...state, mentorPosition: value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Город" value={state.mentorCity} onChange={(value) => onChange({ ...state, mentorCity: value })} />
          <TextField
            label="Telegram"
            value={state.mentorTelegram}
            onChange={(value) => onChange({ ...state, mentorTelegram: value })}
            placeholder="@username"
          />
        </div>
        <TextField
          label="Формат работы"
          value={state.mentorWorkFormat}
          onChange={(value) => onChange({ ...state, mentorWorkFormat: value })}
          placeholder="очные встречи / созвоны / чат"
        />
        <TextField
          label="Фото (URL)"
          value={state.mentorPhoto}
          onChange={(value) => onChange({ ...state, mentorPhoto: value })}
        />
      </div>
    </>
  );
}
