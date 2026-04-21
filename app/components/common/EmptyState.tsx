interface EmptyStateProps {
  text: string;
}

export function EmptyState({ text }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <p className="text-[15px] text-[var(--text-tertiary)]">{text}</p>
    </div>
  );
}
