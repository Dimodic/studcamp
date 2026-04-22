import type { OrgUpdate, UpdateType } from "../../../lib/domain";
import { UPDATE_TYPE_OPTIONS } from "../../../lib/options";
import { SelectField, TextField, ToggleField } from "../form-primitives";

export interface OrgUpdateFormState {
  text: string;
  time: string;
  isNew: boolean;
  type: UpdateType;
}

export function buildOrgUpdateInitial(entity?: Partial<OrgUpdate>): OrgUpdateFormState {
  return {
    text: entity?.text ?? "",
    time: entity?.time ?? "",
    isNew: entity?.isNew ?? true,
    type: entity?.type ?? "info",
  };
}

export function serializeOrgUpdate(state: OrgUpdateFormState) {
  return {
    text: state.text,
    time: state.time,
    isNew: state.isNew,
    type: state.type,
  };
}

interface OrgUpdateFormProps {
  state: OrgUpdateFormState;
  onChange: (next: OrgUpdateFormState) => void;
}

export function OrgUpdateForm({ state, onChange }: OrgUpdateFormProps) {
  return (
    <>
      <TextField
        label="Текст"
        value={state.text}
        multiline
        onChange={(value) => onChange({ ...state, text: value })}
      />
      <TextField
        label="Время"
        value={state.time}
        onChange={(value) => onChange({ ...state, time: value })}
        placeholder="10:35"
      />
      <SelectField
        label="Тип"
        value={state.type}
        onChange={(value) => onChange({ ...state, type: value as UpdateType })}
        options={UPDATE_TYPE_OPTIONS}
      />
      <ToggleField
        label="Пометить как новое"
        checked={state.isNew}
        onChange={(value) => onChange({ ...state, isNew: value })}
      />
    </>
  );
}
