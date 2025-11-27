import { Calendar, ClipboardList, Users, Clock, Stethoscope, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function AppDashboard() {
  const { user } = useAuth();

  const todayStats = [
    { title: 'Appointments', value: '8', icon: Calendar, color: '#14B8A6' },
    { title: 'Pending Tasks', value: '3', icon: ClipboardList, color: '#F59E0B' },
    { title: 'Patients Today', value: '12', icon: Stethoscope, color: '#3B82F6' },
  ];

  const upcomingAppointments = [
    { patient: 'Max (Golden Retriever)', owner: 'John Smith', time: '09:00 AM', type: 'Checkup' },
    { patient: 'Luna (Persian Cat)', owner: 'Sarah Johnson', time: '10:30 AM', type: 'Vaccination' },
    { patient: 'Rocky (German Shepherd)', owner: 'Mike Brown', time: '11:00 AM', type: 'Surgery Follow-up' },
    { patient: 'Bella (Siamese Cat)', owner: 'Emma Wilson', time: '02:00 PM', type: 'Dental Cleaning' },
  ];

  const notifications = [
    { message: 'Lab results ready for Max', time: '10 min ago', type: 'info' },
    { message: 'Appointment reminder: Luna at 10:30 AM', time: '30 min ago', type: 'reminder' },
    { message: 'Medication refill needed for Rocky', time: '1 hour ago', type: 'warning' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good morning, {user?.name || 'Doctor'}!
          </h1>
          <p className="mt-1 text-gray-500">
            Here's your schedule for today
          </p>
        </div>
        <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
          <Calendar className="w-4 h-4 mr-2" />
          View Full Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {todayStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-500" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>Your schedule for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointments.map((apt, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                      {apt.patient.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{apt.patient}</p>
                      <p className="text-sm text-gray-500">{apt.owner}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-teal-600">{apt.time}</p>
                    <p className="text-sm text-gray-500">{apt.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Notifications
            </CardTitle>
            <CardDescription>Recent updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg ${
                    notification.type === 'warning' ? 'bg-amber-50' :
                    notification.type === 'reminder' ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <p className="text-sm text-gray-900">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-teal-600 hover:text-teal-700">
              View All Notifications
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
