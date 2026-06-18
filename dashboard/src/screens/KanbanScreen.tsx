import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Task } from '../lib/supabase';
import { KanbanBoard } from '../components/KanbanBoard';
import { KanbanColumn } from '../components/KanbanColumn';
import { Card } from '../components/Card';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export function KanbanScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const subscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  const columns = [
    { id: 'pending', title: 'Planned', variant: 'warning' as const },
    { id: 'in_progress', title: 'Running', variant: 'info' as const },
    { id: 'done', title: 'Completed', variant: 'success' as const },
    { id: 'failed', title: 'Failed', variant: 'error' as const },
  ];

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Kanban board...</div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 sm:p-8 overflow-hidden">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Task Execution Kanban</h1>
        <p className="text-sm text-gray-500 mt-1">Track the execution status of all generated tasks.</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard>
          {columns.map(col => {
            const columnTasks = getTasksByStatus(col.id);
            return (
              <KanbanColumn
                key={col.id}
                title={col.title}
                count={columnTasks.length}
                badgeVariant={col.variant}
              >
                {columnTasks.map(task => (
                  <Link key={task.id} to={`/tasks/${task.id}`} className="block">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white border-gray-200">
                      <div className="p-3">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-3">
                          <Clock className="w-3 h-3" />
                          {format(new Date(task.created_at), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </KanbanColumn>
            );
          })}
        </KanbanBoard>
      </div>
    </div>
  );
}
