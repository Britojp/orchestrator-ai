import type { ReactNode } from 'react';
import { Badge } from "./Badge";
import type { BadgeVariant } from './Badge';

interface KanbanColumnProps {
  title: string;
  count: number;
  badgeVariant?: BadgeVariant;
  children: ReactNode;
}

export function KanbanColumn({ title, count, badgeVariant = 'default', children }: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-80 bg-gray-50/50 border border-gray-200 rounded-lg flex flex-col max-h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-lg">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <Badge variant={badgeVariant}>{count}</Badge>
      </div>
      <div className="p-3 flex-1 overflow-y-auto space-y-3">
        {children}
      </div>
    </div>
  );
}
