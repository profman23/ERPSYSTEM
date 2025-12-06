import { ClipboardList, Plus, CheckCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AppTasksPage() {
  const tasks = [
    { id: 1, title: 'Review lab results for Max', priority: 'high', status: 'pending', dueTime: 'Today, 11:00 AM' },
    { id: 2, title: 'Prepare medication for Luna', priority: 'medium', status: 'pending', dueTime: 'Today, 12:00 PM' },
    { id: 3, title: 'Call Rocky owner about surgery', priority: 'high', status: 'completed', dueTime: 'Completed' },
    { id: 4, title: 'Update inventory stock', priority: 'low', status: 'pending', dueTime: 'Tomorrow' },
    { id: 5, title: 'Schedule follow-up for Bella', priority: 'medium', status: 'pending', dueTime: 'Today, 4:00 PM' },
  ];

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>Tasks</h1>
          <p className="mt-1" style={{ color: 'var(--app-text-secondary)' }}>Track and manage your daily tasks</p>
        </div>
        <Button 
          className="text-white"
          style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--app-accent-hover))' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="border-0 shadow-sm"
          style={{ background: `linear-gradient(to bottom right, color-mix(in srgb, var(--app-warning) 10%, transparent), color-mix(in srgb, var(--app-warning) 5%, transparent))` }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--app-warning)' }}>High Priority</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{tasks.filter(t => t.priority === 'high' && t.status === 'pending').length}</p>
              </div>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, var(--app-warning) 20%, transparent)` }}
              >
                <ClipboardList className="w-5 h-5" style={{ color: 'var(--app-warning)' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="border-0 shadow-sm"
          style={{ background: `linear-gradient(to bottom right, color-mix(in srgb, var(--app-info) 10%, transparent), color-mix(in srgb, var(--app-accent) 5%, transparent))` }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--app-info)' }}>Pending</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{pendingTasks.length}</p>
              </div>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, var(--app-info) 20%, transparent)` }}
              >
                <Circle className="w-5 h-5" style={{ color: 'var(--app-info)' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="border-0 shadow-sm"
          style={{ background: `linear-gradient(to bottom right, color-mix(in srgb, var(--app-success) 10%, transparent), color-mix(in srgb, var(--app-success) 5%, transparent))` }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--app-success)' }}>Completed Today</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{completedTasks.length}</p>
              </div>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, var(--app-success) 20%, transparent)` }}
              >
                <CheckCircle className="w-5 h-5" style={{ color: 'var(--app-success)' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card 
        className="border-0 shadow-sm"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <CardHeader>
          <CardTitle style={{ color: 'var(--app-text)' }}>Task List</CardTitle>
          <CardDescription style={{ color: 'var(--app-text-secondary)' }}>Your pending and completed tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-4 rounded-xl transition-colors cursor-pointer"
                style={{ 
                  backgroundColor: 'var(--app-surface-hover)',
                  opacity: task.status === 'completed' ? 0.6 : 1
                }}
              >
                <div className="flex items-center gap-4">
                  <button 
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                    style={{ borderColor: 'var(--app-border)' }}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" style={{ color: 'var(--app-accent)' }} />
                    ) : (
                      <Circle className="w-4 h-4" style={{ color: 'var(--app-text-muted)' }} />
                    )}
                  </button>
                  <div>
                    <p 
                      className="font-medium"
                      style={{ 
                        color: task.status === 'completed' ? 'var(--app-text-muted)' : 'var(--app-text)',
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none'
                      }}
                    >
                      {task.title}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{task.dueTime}</p>
                  </div>
                </div>
                <span 
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{ 
                    backgroundColor: `color-mix(in srgb, ${
                      task.priority === 'high' ? 'var(--app-error)' :
                      task.priority === 'medium' ? 'var(--app-warning)' : 'var(--app-text-secondary)'
                    } 20%, transparent)`,
                    color: task.priority === 'high' ? 'var(--app-error)' :
                      task.priority === 'medium' ? 'var(--app-warning)' : 'var(--app-text-secondary)'
                  }}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
