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
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-gray-500">Track and manage your daily tasks</p>
        </div>
        <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.filter(t => t.priority === 'high' && t.status === 'pending').length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingTasks.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Circle className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900">{completedTasks.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <CardDescription>Your pending and completed tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className={`flex items-center justify-between p-4 rounded-xl transition-colors cursor-pointer ${
                  task.status === 'completed' ? 'bg-gray-50 opacity-60' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button className="w-6 h-6 rounded-full border-2 flex items-center justify-center hover:bg-teal-50 transition-colors">
                    {task.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-teal-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <div>
                    <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    <p className="text-sm text-gray-500">{task.dueTime}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                  task.priority === 'high' ? 'bg-red-100 text-red-600' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
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
