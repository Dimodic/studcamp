import { Search, X } from "lucide-react";

import type { UserRole } from "../../lib/domain";
import { FILTER_OPTIONS } from "./constants";
import { FilterChip } from "./FilterChip";

interface PeopleFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: "all" | UserRole;
  onRoleFilterChange: (value: "all" | UserRole) => void;
  counts: Record<"all" | UserRole, number>;
}

export function PeopleFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  counts,
}: PeopleFiltersProps) {
  return (
    <div className="px-5 pb-5 space-y-3">
      <div className="relative">
        <Search
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-tertiary)" }}
        />
        <input
          type="text"
          placeholder="Найти по имени"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded-[var(--radius-md)] pl-11 pr-10 py-2.5 text-[14.5px] outline-none border transition-colors focus:border-[var(--text-tertiary)]"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--line-subtle)",
            color: "var(--text-primary)",
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Очистить поиск"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: "var(--text-tertiary)" }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((filter) => (
          <FilterChip
            key={filter.key}
            label={filter.label}
            count={counts[filter.key]}
            active={roleFilter === filter.key}
            onClick={() => onRoleFilterChange(filter.key)}
          />
        ))}
      </div>
    </div>
  );
}
