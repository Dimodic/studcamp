import type { MouseEvent } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";

const INPUT_CLASSNAME = "w-full border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] outline-none";
const INPUT_STYLE = {
  borderColor: "var(--line-subtle)",
  color: "var(--text-primary)",
  background: "var(--bg-input)",
} as const;

interface FieldLabelProps {
  children: string;
}

export function FieldLabel({ children }: FieldLabelProps) {
  return (
    <label className="block text-[13px] mb-1.5" style={{ color: "var(--text-secondary)" }}>
      {children}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
}

export function TextField({ label, value, onChange, type = "text", multiline = false, placeholder }: TextFieldProps) {
  const displayValue = value == null ? "" : String(value);
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea
          value={displayValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          className={INPUT_CLASSNAME}
          style={INPUT_STYLE}
        />
      ) : (
        <input
          type={type}
          value={displayValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={INPUT_CLASSNAME}
          style={INPUT_STYLE}
        />
      )}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  includeEmpty?: boolean;
}

export function SelectField({ label, value, onChange, options, includeEmpty = false }: SelectFieldProps) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASSNAME}
        style={INPUT_STYLE}
      >
        {includeEmpty && <option value="">Не выбрано</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="flex items-center gap-2.5 text-[14px]" style={{ color: "var(--text-primary)" }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

interface ActionIconButtonProps {
  kind: "plus" | "edit" | "delete" | "hide" | "show";
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

const ACTION_ICONS = {
  plus: Plus,
  edit: Pencil,
  delete: Trash2,
  // "hide" — элемент сейчас виден, клик скроет его (открытый глаз).
  hide: Eye,
  // "show" — элемент уже скрыт, клик откроет (зачёркнутый глаз).
  show: EyeOff,
} as const;

export function ActionIconButton({ kind, label, onClick, className = "" }: ActionIconButtonProps) {
  const Icon = ACTION_ICONS[kind];
  const isDanger = kind === "delete";
  const isMuted = kind === "show";
  const hoverClasses = isDanger
    ? "hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] hover:border-[var(--danger-soft)]"
    : "hover:bg-[var(--bg-subtle)] hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]";
  const mutedStyle = isMuted
    ? { background: "var(--bg-subtle)", borderColor: "var(--line-subtle)", color: "var(--text-tertiary)" }
    : undefined;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 bg-[var(--bg-card)] border-[var(--line-subtle)] text-[var(--text-secondary)] transition-[background-color,color,border-color,transform] duration-150 ${hoverClasses} ${className}`}
      style={mutedStyle}
    >
      <Icon size={14} />
    </button>
  );
}
