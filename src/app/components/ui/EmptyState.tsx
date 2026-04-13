import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
      <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-muted-foreground/60" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-xs mb-8">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium transition-all active:scale-95 hover:brightness-110 shadow-lg shadow-primary/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
