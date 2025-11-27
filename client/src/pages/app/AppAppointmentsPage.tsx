import { Calendar, Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AppAppointmentsPage() {
  const appointments = [
    { id: 1, patient: 'Max', species: 'Dog', owner: 'John Smith', time: '09:00 AM', type: 'Checkup', status: 'confirmed' },
    { id: 2, patient: 'Luna', species: 'Cat', owner: 'Sarah Johnson', time: '10:30 AM', type: 'Vaccination', status: 'confirmed' },
    { id: 3, patient: 'Rocky', species: 'Dog', owner: 'Mike Brown', time: '11:00 AM', type: 'Surgery', status: 'pending' },
    { id: 4, patient: 'Bella', species: 'Cat', owner: 'Emma Wilson', time: '02:00 PM', type: 'Dental', status: 'confirmed' },
    { id: 5, patient: 'Charlie', species: 'Dog', owner: 'David Lee', time: '03:30 PM', type: 'Follow-up', status: 'confirmed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-1 text-gray-500">Manage your scheduled appointments</p>
        </div>
        <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search appointments..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-500" />
            Today's Appointments
          </CardTitle>
          <CardDescription>{appointments.length} appointments scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div 
                key={apt.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                    {apt.patient.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{apt.patient} ({apt.species})</p>
                    <p className="text-sm text-gray-500">{apt.owner}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-semibold text-teal-600">{apt.time}</p>
                    <p className="text-sm text-gray-500">{apt.type}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
