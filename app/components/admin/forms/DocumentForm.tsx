import type { AdminDocument, DocumentStatus } from "../../../lib/domain";
import { DOCUMENT_STATUS_OPTIONS } from "../../../lib/options";
import type { AdminOption } from "../paths";
import { emptyToNull } from "../serializers";
import { SelectField, TextField, ToggleField } from "../form-primitives";

export interface DocumentFormState {
  userId: string;
  title: string;
  description: string;
  status: DocumentStatus;
  deadline: string;
  critical: boolean;
  fallback: string;
}

export function buildDocumentInitial(entity?: Partial<AdminDocument>): DocumentFormState {
  return {
    userId: entity?.userId ?? "",
    title: entity?.title ?? "",
    description: entity?.description ?? "",
    status: entity?.status ?? "not_started",
    deadline: entity?.deadline ?? "",
    critical: entity?.critical ?? false,
    fallback: entity?.fallback ?? "",
  };
}

export function serializeDocument(state: DocumentFormState) {
  return {
    userId: state.userId,
    title: state.title,
    description: state.description,
    status: state.status,
    deadline: emptyToNull(state.deadline),
    critical: state.critical,
    fallback: emptyToNull(state.fallback),
  };
}

interface DocumentFormProps {
  state: DocumentFormState;
  onChange: (next: DocumentFormState) => void;
  userOptions?: AdminOption[];
}

export function DocumentForm({ state, onChange, userOptions = [] }: DocumentFormProps) {
  return (
    <>
      <SelectField
        label="Пользователь"
        value={state.userId}
        onChange={(value) => onChange({ ...state, userId: value })}
        options={userOptions.map((user) => ({ value: user.id, label: user.label }))}
      />
      <TextField
        label="Название"
        value={state.title}
        onChange={(value) => onChange({ ...state, title: value })}
      />
      <TextField
        label="Описание"
        value={state.description}
        multiline
        onChange={(value) => onChange({ ...state, description: value })}
      />
      <SelectField
        label="Статус"
        value={state.status}
        onChange={(value) => onChange({ ...state, status: value as DocumentStatus })}
        options={DOCUMENT_STATUS_OPTIONS}
      />
      <TextField
        label="Дедлайн"
        type="date"
        value={state.deadline}
        onChange={(value) => onChange({ ...state, deadline: value })}
      />
      <TextField
        label="Fallback"
        value={state.fallback}
        multiline
        onChange={(value) => onChange({ ...state, fallback: value })}
      />
      <ToggleField
        label="Критичный документ"
        checked={state.critical}
        onChange={(value) => onChange({ ...state, critical: value })}
      />
    </>
  );
}
