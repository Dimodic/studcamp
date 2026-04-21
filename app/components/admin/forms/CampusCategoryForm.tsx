import type { CampusCategory } from "../../../lib/domain";
import { ActionIconButton, FieldLabel, TextField } from "../form-primitives";

interface CategoryItemDraft {
  title: string;
  detail: string;
}

export interface CampusCategoryFormState {
  icon: string;
  title: string;
  items: CategoryItemDraft[];
}

export function buildCampusCategoryInitial(entity?: Partial<CampusCategory>): CampusCategoryFormState {
  return {
    // "auto" — система сама подбирает иконку по заголовку
    // (см. resolveCategoryIcon в campus-page.tsx).
    icon: entity?.icon ?? "auto",
    title: entity?.title ?? "",
    items:
      entity?.items?.map((item) => ({
        title: item.title ?? "",
        detail: item.detail ?? "",
      })) ?? [{ title: "", detail: "" }],
  };
}

export function serializeCampusCategory(state: CampusCategoryFormState) {
  return {
    icon: state.icon,
    title: state.title,
    items: state.items
      .filter((item) => item.title.trim() || item.detail.trim())
      .map((item) => ({ title: item.title, detail: item.detail })),
  };
}

interface CampusCategoryFormProps {
  state: CampusCategoryFormState;
  onChange: (next: CampusCategoryFormState) => void;
}

export function CampusCategoryForm({ state, onChange }: CampusCategoryFormProps) {
  const updateItem = (index: number, patch: Partial<CategoryItemDraft>) => {
    onChange({
      ...state,
      items: state.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  };

  const addItem = () => {
    onChange({ ...state, items: [...state.items, { title: "", detail: "" }] });
  };

  return (
    <>
      <TextField
        label="Иконка"
        value={state.icon}
        onChange={(value) => onChange({ ...state, icon: value })}
        placeholder="auto — подберём по заголовку"
      />
      <TextField label="Заголовок" value={state.title} onChange={(value) => onChange({ ...state, title: value })} />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <FieldLabel>Пункты</FieldLabel>
          <ActionIconButton kind="plus" label="Добавить пункт" onClick={(event) => { event.preventDefault(); addItem(); }} />
        </div>
        {state.items.map((item, index) => (
          <div key={index} className="p-3 rounded-[var(--radius-md)] border space-y-3" style={{ borderColor: "var(--line-subtle)" }}>
            <TextField
              label={`Пункт ${index + 1}: заголовок`}
              value={item.title}
              onChange={(value) => updateItem(index, { title: value })}
            />
            <TextField
              label="Описание"
              value={item.detail}
              multiline
              onChange={(value) => updateItem(index, { detail: value })}
            />
          </div>
        ))}
      </div>
    </>
  );
}
