import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Task } from '../lib/supabase';
import { StatusBadge } from '../components/Badge';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ArrowLeft, ExternalLink, RefreshCw, GitBranch, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function TaskDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTask(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task details');
      console.error('Error fetching task:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();

    if (!id) return;

    // Subscribe to realtime changes for this specific task
    const subscription = supabase
      .channel(`task-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `id=eq.${id}`
      }, (payload) => {
        setTask(payload.new as Task);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  if (loading && !task) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
        <Card className="border-red-200">
          <div className="p-6 text-center text-red-600">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-medium mb-2">Error Loading Task</h2>
            <p>{error || 'Task not found'}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/">
        <Button variant="ghost" className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="font-mono">{task.id}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(task.created_at), 'MMM d, yyyy HH:mm')}
            </div>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-1 md:col-span-2">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap mb-8">
              {task.description}
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-4">Acceptance Criteria</h3>
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-md border border-gray-100">
              {task.acceptance_criteria}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Execution Details">
            <div className="space-y-4">
              {task.pr_url && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Pull Request</div>
                  <a
                    href={task.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    #{task.pr_number || 'Link'} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {task.branch_name && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Branch</div>
                  <div className="inline-flex items-center gap-2 text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono">
                    <GitBranch className="w-3 h-3" />
                    {task.branch_name}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Retries</div>
                <div className="text-sm text-gray-900">{task.retry_count}</div>
              </div>

              {task.started_at && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Started At</div>
                  <div className="text-sm text-gray-900">
                    {format(new Date(task.started_at), 'MMM d, yyyy HH:mm:ss')}
                  </div>
                </div>
              )}

              {task.completed_at && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Completed At</div>
                  <div className="text-sm text-gray-900">
                    {format(new Date(task.completed_at), 'MMM d, yyyy HH:mm:ss')}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {task.error_message && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <div className="p-6">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
              <AlertCircle className="w-5 h-5" />
              Error Message
            </div>
            <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono overflow-x-auto">
              {task.error_message}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
}
