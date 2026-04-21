import type { Project } from "../../../lib/domain";
import { toNumberOrFallback } from "../serializers";
import { TextField } from "../form-primitives";

export interface ProjectFormState {
  title: string;
  shortDescription: string;
  direction: string;
  minTeam: number | string;
  maxTeam: number | string;
}

export function buildProjectInitial(entity?: Partial<Project>): ProjectFormState {
  return {
    title: entity?.title ?? "",
    shortDescription: entity?.shortDescription ?? "",
    direction: entity?.direction ?? "",
    minTeam: entity?.minTeam ?? 1,
    maxTeam: entity?.maxTeam ?? 1,
  };
}

export function serializeProject(state: ProjectFormState) {
  return {
    title: state.title,
    shortDescription: state.shortDescription,
    direction: state.direction,
    minTeam: toNumberOrFallback(state.minTeam, 1),
    maxTeam: toNumberOrFallback(state.maxTeam, 1),
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
      <TextField label="Направление" value={state.direction} onChange={(value) => onChange({ ...state, direction: value })} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Мин. команда" type="number" value={state.minTeam} onChange={(value) => onChange({ ...state, minTeam: value })} />
        <TextField label="Макс. команда" type="number" value={state.maxTeam} onChange={(value) => onChange({ ...state, maxTeam: value })} />
      </div>
    </>
  );
}
