import type { ReactNode } from 'react';
import { format } from 'date-fns';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  icon?: ReactNode;
  status?: 'completed' | 'current' | 'upcoming' | 'failed';
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                    ${event.status === 'completed' ? 'bg-green-500 text-white' :
                      event.status === 'current' ? 'bg-blue-500 text-white' :
                      event.status === 'failed' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                  >
                    {event.icon || <div className="h-2.5 w-2.5 rounded-full bg-current" />}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    {event.description && (
                      <p className="mt-1 text-sm text-gray-500">{event.description}</p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    <time dateTime={event.date}>{format(new Date(event.date), 'MMM d, HH:mm')}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
