import type { ReactNode } from 'react';

export function KanbanBoard({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full overflow-x-auto gap-4 pb-4 px-2">
      {children}
    </div>
  );
}
