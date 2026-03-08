/**
 * PatientDetailPage — Read-only patient detail view
 */

import { useParams, useNavigate } from 'react-router-dom';
import { Edit, ArrowLeft } from 'lucide-react';
import { usePatientDetail } from '@/hooks/usePatients';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</dt>
      <dd className="mt-0.5" style={{ color: 'var(--color-text)' }}>{value}</dd>
    </div>
  );
}

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading, error } = usePatientDetail(patientId);

  if (isLoading) return <PageSkeleton />;

  if (error || !patient) {
    return (
      <div className="p-8 text-center" style={{ color: 'var(--color-text-danger)' }}>
        Patient not found.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/app/patients')}>
            <ArrowLeft className="w-4 h-4 me-2" /> Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  const computeAge = (): string => {
    if (patient.dateOfBirth) {
      const dob = new Date(patient.dateOfBirth);
      const now = new Date();
      const years = now.getFullYear() - dob.getFullYear();
      const months = now.getMonth() - dob.getMonth();
      if (years > 0) return `${years} year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''}`;
      if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
      return 'Newborn';
    }
    const parts = [];
    if (patient.ageYears) parts.push(`${patient.ageYears} year${patient.ageYears > 1 ? 's' : ''}`);
    if (patient.ageMonths) parts.push(`${patient.ageMonths} month${patient.ageMonths > 1 ? 's' : ''}`);
    if (patient.ageDays) parts.push(`${patient.ageDays} day${patient.ageDays > 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(', ') : '—';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.name}
        titleAr={patient.nameAr}
        backLink="/app/patients"
        actions={
          <Button className="btn-primary" onClick={() => navigate(`/app/patients/${patientId}/edit`)}>
            <Edit className="w-4 h-4 me-2" /> Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Info */}
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Patient Information</h3>
          <dl className="grid grid-cols-2 gap-4">
            <DetailRow label="Code" value={patient.code} />
            <DetailRow label="Name" value={patient.name} />
            <DetailRow label="Species" value={patient.speciesName} />
            <DetailRow label="Breed" value={patient.breedName} />
            <DetailRow label="Gender" value={patient.gender} />
            <DetailRow label="Reproductive Status" value={patient.reproductiveStatus} />
            <DetailRow label="Color" value={patient.color} />
            <DetailRow label="Age" value={computeAge()} />
            <DetailRow label="Distinctive Marks" value={patient.distinctiveMarks} />
            <div>
              <dt className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Status</dt>
              <dd className="mt-0.5">
                <Badge variant={patient.isActive ? 'default' : 'error'}>
                  {patient.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>

        {/* Owner Info */}
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Owner Information</h3>
          <dl className="grid grid-cols-2 gap-4">
            <DetailRow label="Name" value={`${patient.ownerFirstName || ''} ${patient.ownerLastName || ''}`} />
            <DetailRow label="Email" value={patient.ownerEmail} />
            <DetailRow label="Phone" value={patient.ownerPhone} />
          </dl>
        </div>

        {/* IDs & Documents */}
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>IDs & Documents</h3>
          <dl className="grid grid-cols-2 gap-4">
            <DetailRow label="Microchip ID" value={patient.microchipId} />
            <DetailRow label="Passport Series" value={patient.passportSeries} />
            <DetailRow label="Insurance Number" value={patient.insuranceNumber} />
            <DetailRow label="Date of Birth" value={patient.dateOfBirth} />
          </dl>
        </div>

        {/* Internal Notes */}
        {patient.internalNotes && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Internal Notes
              <span className="text-xs ms-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--badge-danger-bg)', color: 'var(--color-text-danger)' }}>
                Private
              </span>
            </h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>{patient.internalNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
