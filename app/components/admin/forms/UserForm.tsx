import type { AdminUser, UserRole, VisibilityMode } from "../../../lib/domain";
import { ROLE_OPTIONS, VISIBILITY_OPTIONS } from "../../../lib/options";
import { emptyToNull } from "../serializers";
import { SelectField, TextField, ToggleField } from "../form-primitives";

export interface UserFormState {
  name: string;
  role: UserRole;
  university: string;
  city: string;
  telegram: string;
  photo: string;
  visibility: VisibilityMode;
  notificationsOn: boolean;
  isActive: boolean;
  showInPeople: boolean;
  email: string;
  password: string;
}

export function buildUserInitial(entity?: Partial<AdminUser>): UserFormState {
  return {
    name: entity?.name ?? "",
    role: entity?.role ?? "participant",
    university: entity?.university ?? "",
    city: entity?.city ?? "",
    telegram: entity?.telegram ?? "",
    photo: entity?.photo ?? "",
    visibility: entity?.visibility ?? "name_plus_fields",
    notificationsOn: entity?.notificationsOn ?? true,
    isActive: entity?.isActive ?? true,
    showInPeople: entity?.showInPeople ?? true,
    email: entity?.email ?? "",
    password: "",
  };
}

export function serializeUser(state: UserFormState) {
  return {
    name: state.name,
    role: state.role,
    university: emptyToNull(state.university),
    city: emptyToNull(state.city),
    telegram: emptyToNull(state.telegram),
    photo: emptyToNull(state.photo),
    visibility: state.visibility,
    notificationsOn: state.notificationsOn,
    isActive: state.isActive,
    showInPeople: state.showInPeople,
    email: emptyToNull(state.email),
    password: state.password || null,
  };
}

interface UserFormProps {
  state: UserFormState;
  onChange: (next: UserFormState) => void;
  mode: "create" | "edit";
}

export function UserForm({ state, onChange, mode }: UserFormProps) {
  return (
    <>
      <TextField
        label="Имя"
        value={state.name}
        onChange={(value) => onChange({ ...state, name: value })}
      />
      <SelectField
        label="Роль"
        value={state.role}
        onChange={(value) => onChange({ ...state, role: value as UserRole })}
        options={ROLE_OPTIONS}
      />
      <TextField
        label="ВУЗ / компания"
        value={state.university}
        onChange={(value) => onChange({ ...state, university: value })}
      />
      <TextField
        label="Город"
        value={state.city}
        onChange={(value) => onChange({ ...state, city: value })}
      />
      <TextField
        label="Telegram"
        value={state.telegram}
        onChange={(value) => onChange({ ...state, telegram: value })}
      />
      <TextField
        label="Фото URL"
        value={state.photo}
        onChange={(value) => onChange({ ...state, photo: value })}
      />
      <SelectField
        label="Видимость"
        value={state.visibility}
        onChange={(value) => onChange({ ...state, visibility: value as VisibilityMode })}
        options={VISIBILITY_OPTIONS}
      />
      <TextField
        label="Email"
        value={state.email}
        type="email"
        onChange={(value) => onChange({ ...state, email: value })}
      />
      <TextField
        label="Пароль"
        value={state.password}
        type="password"
        onChange={(value) => onChange({ ...state, password: value })}
        placeholder={mode === "edit" ? "Оставьте пустым, чтобы не менять" : ""}
      />
      <div className="space-y-2">
        <ToggleField
          label="Активен"
          checked={state.isActive}
          onChange={(value) => onChange({ ...state, isActive: value })}
        />
        <ToggleField
          label="Показывать в списке людей"
          checked={state.showInPeople}
          onChange={(value) => onChange({ ...state, showInPeople: value })}
        />
        <ToggleField
          label="Уведомления включены"
          checked={state.notificationsOn}
          onChange={(value) => onChange({ ...state, notificationsOn: value })}
        />
      </div>
    </>
  );
}
