import type { Material, MaterialType } from "../../../lib/domain";
import { MATERIAL_TYPE_OPTIONS } from "../../../lib/options";
import type { AdminOption } from "../paths";
import { emptyToNull, toNumberOrNull } from "../serializers";
import { SelectField, TextField, ToggleField } from "../form-primitives";

export interface MaterialFormState {
  title: string;
  type: MaterialType;
  day: number | string;
  eventId: string;
  topic: string;
  fileSize: string;
  isNew: boolean;
  url: string;
}

export function buildMaterialInitial(entity?: Partial<Material>): MaterialFormState {
  return {
    title: entity?.title ?? "",
    type: entity?.type ?? "guide",
    day: entity?.day ?? "",
    eventId: entity?.eventId ?? "",
    topic: entity?.topic ?? "",
    fileSize: entity?.fileSize ?? "",
    isNew: entity?.isNew ?? false,
    url: entity?.url ?? "",
  };
}

export function serializeMaterial(state: MaterialFormState) {
  return {
    title: state.title,
    type: state.type,
    day: toNumberOrNull(state.day),
    eventId: emptyToNull(state.eventId),
    topic: emptyToNull(state.topic),
    fileSize: emptyToNull(state.fileSize),
    isNew: state.isNew,
    url: state.url,
  };
}

interface MaterialFormProps {
  state: MaterialFormState;
  onChange: (next: MaterialFormState) => void;
  eventOptions?: AdminOption[];
}

export function MaterialForm({ state, onChange, eventOptions = [] }: MaterialFormProps) {
  return (
    <>
      <TextField
        label="Название"
        value={state.title}
        onChange={(value) => onChange({ ...state, title: value })}
      />
      <SelectField
        label="Тип"
        value={state.type}
        onChange={(value) => onChange({ ...state, type: value as MaterialType })}
        options={MATERIAL_TYPE_OPTIONS}
      />
      <TextField
        label="День"
        type="number"
        value={state.day}
        onChange={(value) => onChange({ ...state, day: value })}
      />
      <SelectField
        label="Событие"
        value={state.eventId}
        onChange={(value) => onChange({ ...state, eventId: value })}
        options={eventOptions.map((event) => ({ value: event.id, label: event.label }))}
        includeEmpty
      />
      <TextField
        label="Тема"
        value={state.topic}
        onChange={(value) => onChange({ ...state, topic: value })}
      />
      <TextField
        label="Размер файла"
        value={state.fileSize}
        onChange={(value) => onChange({ ...state, fileSize: value })}
      />
      <TextField
        label="URL"
        value={state.url}
        onChange={(value) => onChange({ ...state, url: value })}
      />
      <ToggleField
        label="Пометить как новое"
        checked={state.isNew}
        onChange={(value) => onChange({ ...state, isNew: value })}
      />
    </>
  );
}
