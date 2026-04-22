import type { Camp } from "../../../lib/domain";
import { emptyToNull } from "../serializers";
import { TextField } from "../form-primitives";

export interface CampFormState {
  name: string;
  shortDesc: string;
  city: string;
  university: string;
  startDate: string;
  endDate: string;
  status: string;
}

export function buildCampInitial(
  entity?: Partial<Camp> & { startDate?: string; endDate?: string },
): CampFormState {
  return {
    name: entity?.name ?? "",
    shortDesc: entity?.shortDesc ?? "",
    city: entity?.city ?? "",
    university: entity?.university ?? "",
    startDate: entity?.dates?.start ?? entity?.startDate ?? "",
    endDate: entity?.dates?.end ?? entity?.endDate ?? "",
    status: entity?.status ?? "active",
  };
}

export function serializeCamp(state: CampFormState) {
  return {
    name: state.name,
    shortDesc: emptyToNull(state.shortDesc),
    city: state.city,
    university: state.university,
    startDate: state.startDate,
    endDate: state.endDate,
    status: state.status,
  };
}

interface CampFormProps {
  state: CampFormState;
  onChange: (next: CampFormState) => void;
}

export function CampForm({ state, onChange }: CampFormProps) {
  return (
    <>
      <TextField
        label="Название"
        value={state.name}
        onChange={(value) => onChange({ ...state, name: value })}
      />
      <TextField
        label="Краткое описание"
        value={state.shortDesc}
        multiline
        onChange={(value) => onChange({ ...state, shortDesc: value })}
      />
      <TextField
        label="Город"
        value={state.city}
        onChange={(value) => onChange({ ...state, city: value })}
      />
      <TextField
        label="Организация"
        value={state.university}
        onChange={(value) => onChange({ ...state, university: value })}
      />
      <TextField
        label="Дата начала"
        value={state.startDate}
        type="date"
        onChange={(value) => onChange({ ...state, startDate: value })}
      />
      <TextField
        label="Дата окончания"
        value={state.endDate}
        type="date"
        onChange={(value) => onChange({ ...state, endDate: value })}
      />
      <TextField
        label="Статус"
        value={state.status}
        onChange={(value) => onChange({ ...state, status: value })}
      />
    </>
  );
}
