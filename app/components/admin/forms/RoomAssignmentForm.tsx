import type { AdminRoomAssignment } from "../../../lib/domain";
import type { AdminOption } from "../paths";
import { joinLines, splitCsvOrLines, toNumberOrFallback } from "../serializers";
import { SelectField, TextField } from "../form-primitives";

export interface RoomAssignmentFormState {
  userId: string;
  number: string;
  floor: number | string;
  building: string;
  neighborsText: string;
  keyInfo: string;
  rulesText: string;
}

export function buildRoomAssignmentInitial(entity?: Partial<AdminRoomAssignment>): RoomAssignmentFormState {
  return {
    userId: entity?.userId ?? "",
    number: entity?.number ?? "",
    floor: entity?.floor ?? 1,
    building: entity?.building ?? "",
    neighborsText: joinLines(entity?.neighbors),
    keyInfo: entity?.keyInfo ?? "",
    rulesText: joinLines(entity?.rules),
  };
}

export function serializeRoomAssignment(state: RoomAssignmentFormState) {
  return {
    userId: state.userId,
    number: state.number,
    floor: toNumberOrFallback(state.floor, 1),
    building: state.building,
    neighbors: splitCsvOrLines(state.neighborsText),
    keyInfo: state.keyInfo,
    rules: splitCsvOrLines(state.rulesText),
  };
}

interface RoomAssignmentFormProps {
  state: RoomAssignmentFormState;
  onChange: (next: RoomAssignmentFormState) => void;
  userOptions?: AdminOption[];
}

export function RoomAssignmentForm({ state, onChange, userOptions = [] }: RoomAssignmentFormProps) {
  return (
    <>
      <SelectField
        label="Пользователь"
        value={state.userId}
        onChange={(value) => onChange({ ...state, userId: value })}
        options={userOptions.map((user) => ({ value: user.id, label: user.label }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Комната" value={state.number} onChange={(value) => onChange({ ...state, number: value })} />
        <TextField label="Этаж" type="number" value={state.floor} onChange={(value) => onChange({ ...state, floor: value })} />
      </div>
      <TextField label="Здание" value={state.building} onChange={(value) => onChange({ ...state, building: value })} />
      <TextField
        label="Соседи"
        value={state.neighborsText}
        multiline
        onChange={(value) => onChange({ ...state, neighborsText: value })}
        placeholder="через запятую или с новой строки"
      />
      <TextField
        label="Инфо по ключу"
        value={state.keyInfo}
        multiline
        onChange={(value) => onChange({ ...state, keyInfo: value })}
      />
      <TextField
        label="Правила"
        value={state.rulesText}
        multiline
        onChange={(value) => onChange({ ...state, rulesText: value })}
        placeholder="по одному на строку"
      />
    </>
  );
}
