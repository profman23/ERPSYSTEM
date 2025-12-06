import { Stethoscope, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AppPatientsPage() {
  const patients = [
    { id: 1, name: 'Max', species: 'Dog', breed: 'Golden Retriever', owner: 'John Smith', age: '3 years', lastVisit: '2 days ago' },
    { id: 2, name: 'Luna', species: 'Cat', breed: 'Persian', owner: 'Sarah Johnson', age: '2 years', lastVisit: '1 week ago' },
    { id: 3, name: 'Rocky', species: 'Dog', breed: 'German Shepherd', owner: 'Mike Brown', age: '5 years', lastVisit: '3 days ago' },
    { id: 4, name: 'Bella', species: 'Cat', breed: 'Siamese', owner: 'Emma Wilson', age: '1 year', lastVisit: 'Today' },
    { id: 5, name: 'Charlie', species: 'Dog', breed: 'Labrador', owner: 'David Lee', age: '4 years', lastVisit: '2 weeks ago' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>Patients</h1>
          <p className="mt-1" style={{ color: 'var(--app-text-secondary)' }}>Manage patient records and medical history</p>
        </div>
        <Button 
          className="text-white"
          style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--app-accent-hover))' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      <Card 
        className="border-0 shadow-sm"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--app-text-muted)' }} />
            <Input placeholder="Search patients by name, owner, or species..." className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card 
        className="border-0 shadow-sm"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
            <Stethoscope className="w-5 h-5" style={{ color: 'var(--app-accent)' }} />
            Patient Records
          </CardTitle>
          <CardDescription style={{ color: 'var(--app-text-secondary)' }}>{patients.length} patients registered</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {patients.map((patient) => (
              <div 
                key={patient.id}
                className="flex items-center justify-between p-4 rounded-xl transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--app-surface-hover)' }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--app-info), var(--app-accent))' }}
                  >
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--app-text)' }}>{patient.name}</p>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{patient.species} • {patient.breed}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>{patient.owner}</p>
                    <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>{patient.age}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>Last visit</p>
                    <p className="text-sm" style={{ color: 'var(--app-accent)' }}>{patient.lastVisit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
