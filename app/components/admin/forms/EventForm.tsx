import type { Event, EventStatus } from "../../../lib/domain";
import { EVENT_STATUS_OPTIONS } from "../../../lib/options";
import type { AdminOption } from "../paths";
import { joinLines, splitCsvOrLines, todayIso } from "../serializers";
import { FieldLabel, SelectField, TextField } from "../form-primitives";

export interface EventFormState {
  date: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  place: string;
  building: string;
  address: string;
  status: EventStatus;
  description: string;
  materialsText: string;
  teacherIds: string[];
}

export function buildEventInitial(
  entity?: Partial<Event>,
  defaults?: Partial<EventFormState>,
): EventFormState {
  const base = { ...entity, ...defaults };
  return {
    date: String(base.date ?? todayIso()),
    title: base.title ?? "",
    type: base.type ?? "",
    startAt: base.startAt ?? "",
    endAt: base.endAt ?? "",
    place: base.place ?? "",
    building: base.building ?? "",
    address: base.address ?? "",
    status: (base.status as EventStatus | undefined) ?? "upcoming",
    description: base.description ?? "",
    materialsText: joinLines(entity?.materials),
    teacherIds: base.teacherIds ?? [],
  };
}

export function serializeEvent(state: EventFormState) {
  return {
    date: state.date,
    title: state.title,
    type: state.type,
    startAt: state.startAt,
    endAt: state.endAt,
    place: state.place,
    building: state.building,
    address: state.address,
    status: state.status,
    description: state.description || null,
    materials: splitCsvOrLines(state.materialsText),
    teacherIds: state.teacherIds,
  };
}

interface EventFormProps {
  state: EventFormState;
  onChange: (next: EventFormState) => void;
  allowTeacherAssignment?: boolean;
  teacherOptions?: AdminOption[];
}

export function EventForm({ state, onChange, allowTeacherAssignment = false, teacherOptions = [] }: EventFormProps) {
  const toggleTeacher = (teacherId: string, checked: boolean) => {
    const current = new Set(state.teacherIds);
    if (checked) {
      current.add(teacherId);
    } else {
      current.delete(teacherId);
    }
    onChange({ ...state, teacherIds: [...current] });
  };

  return (
    <>
      <TextField label="Дата" type="date" value={state.date} onChange={(value) => onChange({ ...state, date: value })} />
      <TextField label="Название" value={state.title} onChange={(value) => onChange({ ...state, title: value })} />
      <TextField label="Тип" value={state.type} onChange={(value) => onChange({ ...state, type: value })} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Начало" value={state.startAt} onChange={(value) => onChange({ ...state, startAt: value })} placeholder="09:00" />
        <TextField label="Конец" value={state.endAt} onChange={(value) => onChange({ ...state, endAt: value })} placeholder="10:30" />
      </div>
      <TextField label="Место" value={state.place} onChange={(value) => onChange({ ...state, place: value })} />
      <TextField label="Корпус / площадка" value={state.building} onChange={(value) => onChange({ ...state, building: value })} />
      <TextField label="Адрес" value={state.address} onChange={(value) => onChange({ ...state, address: value })} />
      <SelectField
        label="Статус"
        value={state.status}
        onChange={(value) => onChange({ ...state, status: value as EventStatus })}
        options={EVENT_STATUS_OPTIONS}
      />
      <TextField label="Описание" value={state.description} multiline onChange={(value) => onChange({ ...state, description: value })} />
      <TextField
        label="Материалы / заметки"
        value={state.materialsText}
        multiline
        onChange={(value) => onChange({ ...state, materialsText: value })}
        placeholder="по одному на строку"
      />
      {allowTeacherAssignment && (
        <div>
          <FieldLabel>Преподаватели</FieldLabel>
          <div className="space-y-2 rounded-[var(--radius-md)] border p-3" style={{ borderColor: "var(--line-subtle)" }}>
            {teacherOptions.map((teacher) => (
              <label key={teacher.id} className="flex items-center gap-2.5 text-[14px]" style={{ color: "var(--text-primary)" }}>
                <input
                  type="checkbox"
                  checked={state.teacherIds.includes(teacher.id)}
                  onChange={(event) => toggleTeacher(teacher.id, event.target.checked)}
                />
                {teacher.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
