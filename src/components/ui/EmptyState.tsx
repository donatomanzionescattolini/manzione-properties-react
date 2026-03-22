interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4 opacity-40">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-600 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-6">{description}</p>}
      {action}
    </div>
  );
}
