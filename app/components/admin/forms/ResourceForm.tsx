import type { Resource, ResourceCategory, ResourceKind } from "../../../lib/domain";
import { RESOURCE_CATEGORY_OPTIONS, RESOURCE_KIND_OPTIONS } from "../../../lib/options";
import type { AdminOption } from "../paths";
import { emptyToNull, toNumberOrNull } from "../serializers";
import { SelectField, TextField, ToggleField } from "../form-primitives";

export interface ResourceFormState {
  title: string;
  category: ResourceCategory;
  kind: ResourceKind;
  description: string;
  url: string;
  day: number | string;
  eventId: string;
  isNew: boolean;
}

export function buildResourceInitial(entity?: Partial<Resource>): ResourceFormState {
  return {
    title: entity?.title ?? "",
    category: entity?.category ?? "study",
    kind: entity?.kind ?? "doc",
    description: entity?.description ?? "",
    url: entity?.url ?? "",
    day: entity?.day ?? "",
    eventId: entity?.eventId ?? "",
    isNew: entity?.isNew ?? false,
  };
}

export function serializeResource(state: ResourceFormState) {
  return {
    title: state.title,
    category: state.category,
    kind: state.kind,
    description: emptyToNull(state.description),
    url: state.url,
    day: toNumberOrNull(state.day),
    eventId: emptyToNull(state.eventId),
    isNew: state.isNew,
  };
}

interface ResourceFormProps {
  state: ResourceFormState;
  onChange: (next: ResourceFormState) => void;
  eventOptions?: AdminOption[];
}

export function ResourceForm({ state, onChange, eventOptions = [] }: ResourceFormProps) {
  return (
    <>
      <TextField label="Название" value={state.title} onChange={(value) => onChange({ ...state, title: value })} />
      <SelectField
        label="Категория"
        value={state.category}
        onChange={(value) => onChange({ ...state, category: value as ResourceCategory })}
        options={RESOURCE_CATEGORY_OPTIONS}
      />
      <SelectField
        label="Тип ссылки"
        value={state.kind}
        onChange={(value) => onChange({ ...state, kind: value as ResourceKind })}
        options={RESOURCE_KIND_OPTIONS}
      />
      <TextField
        label="Описание"
        value={state.description}
        multiline
        onChange={(value) => onChange({ ...state, description: value })}
      />
      <TextField label="URL" value={state.url} onChange={(value) => onChange({ ...state, url: value })} />
      <TextField label="День" type="number" value={state.day} onChange={(value) => onChange({ ...state, day: value })} />
      <SelectField
        label="Событие"
        value={state.eventId}
        onChange={(value) => onChange({ ...state, eventId: value })}
        options={eventOptions.map((event) => ({ value: event.id, label: event.label }))}
        includeEmpty
      />
      <ToggleField label="Пометить как новое" checked={state.isNew} onChange={(value) => onChange({ ...state, isNew: value })} />
    </>
  );
}
