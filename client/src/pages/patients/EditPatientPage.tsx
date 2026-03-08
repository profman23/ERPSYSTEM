/**
 * EditPatientPage — Edit existing patient (pre-populated form)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { usePatientDetail, useUpdatePatient } from '@/hooks/usePatients';
import { useSpeciesList } from '@/hooks/useSpecies';
import { useBreedsBySpecies } from '@/hooks/useBreeds';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';

export default function EditPatientPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: patient, isLoading } = usePatientDetail(patientId);
  const updateMutation = useUpdatePatient();

  const [petName, setPetName] = useState('');
  const [petNameAr, setPetNameAr] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [breedId, setBreedId] = useState('');
  const [crossBreedId, setCrossBreedId] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [reproductiveStatus, setReproductiveStatus] = useState<'intact' | 'neutered' | 'spayed'>('intact');
  const [color, setColor] = useState('');
  const [distinctiveMarks, setDistinctiveMarks] = useState('');
  const [ageMode, setAgeMode] = useState<'exact' | 'estimated'>('exact');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [ageDays, setAgeDays] = useState('');
  const [passportSeries, setPassportSeries] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [microchipId, setMicrochipId] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: speciesData } = useSpeciesList({ limit: 100, isActive: 'true' });
  const { data: breedsData } = useBreedsBySpecies(speciesId || undefined);

  // Pre-populate form when patient data loads
  useEffect(() => {
    if (!patient) return;
    setPetName(patient.name || '');
    setPetNameAr(patient.nameAr || '');
    setSpeciesId(patient.speciesId || '');
    setBreedId(patient.breedId || '');
    setCrossBreedId(patient.crossBreedId || '');
    setGender((patient.gender as any) || 'unknown');
    setReproductiveStatus((patient.reproductiveStatus as any) || 'intact');
    setColor(patient.color || '');
    setDistinctiveMarks(patient.distinctiveMarks || '');
    setPassportSeries(patient.passportSeries || '');
    setInsuranceNumber(patient.insuranceNumber || '');
    setMicrochipId(patient.microchipId || '');
    setInternalNotes(patient.internalNotes || '');

    if (patient.dateOfBirth) {
      setAgeMode('exact');
      setDateOfBirth(patient.dateOfBirth);
    } else {
      setAgeMode('estimated');
      setAgeYears(patient.ageYears?.toString() || '');
      setAgeMonths(patient.ageMonths?.toString() || '');
      setAgeDays(patient.ageDays?.toString() || '');
    }
  }, [patient]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setError(null);

    if (!petName.trim()) {
      showToast('error', 'Name required', 'Pet name is required.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: patientId,
        name: petName,
        nameAr: petNameAr || undefined,
        speciesId: speciesId || undefined,
        breedId: breedId || null,
        crossBreedId: crossBreedId || null,
        gender,
        reproductiveStatus,
        color: color || undefined,
        distinctiveMarks: distinctiveMarks || undefined,
        dateOfBirth: ageMode === 'exact' ? dateOfBirth : null,
        ageYears: ageMode === 'estimated' && ageYears ? parseInt(ageYears) : null,
        ageMonths: ageMode === 'estimated' && ageMonths ? parseInt(ageMonths) : null,
        ageDays: ageMode === 'estimated' && ageDays ? parseInt(ageDays) : null,
        passportSeries: passportSeries || undefined,
        insuranceNumber: insuranceNumber || undefined,
        microchipId: microchipId || undefined,
        internalNotes: internalNotes || undefined,
      });

      showToast('success', 'Patient updated', `${petName} has been updated.`);
      navigate(`/app/patients/${patientId}`);
    } catch (err) {
      const { message } = extractApiError(err);
      setError(message);
    }
  }, [
    patientId, petName, petNameAr, speciesId, breedId, crossBreedId, gender,
    reproductiveStatus, color, distinctiveMarks, ageMode, dateOfBirth,
    ageYears, ageMonths, ageDays, passportSeries, insuranceNumber,
    microchipId, internalNotes, updateMutation, navigate, showToast,
  ]);

  if (isLoading) return <PageSkeleton />;

  const speciesList = speciesData?.data ?? [];
  const breedsList = breedsData?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit: ${patient?.name || 'Patient'}`}
        titleAr={patient?.nameAr ? `تعديل: ${patient.nameAr}` : undefined}
        backLink={`/app/patients/${patientId}`}
      />

      <div
        className="max-w-2xl rounded-lg border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: 'var(--badge-danger-bg)', borderColor: 'var(--badge-danger-border)', color: 'var(--color-text-danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pet Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Pet Name *</Label>
              <Input value={petName} onChange={(e) => setPetName(e.target.value)} />
            </div>
            <div>
              <Label>Pet Name (Arabic)</Label>
              <Input value={petNameAr} onChange={(e) => setPetNameAr(e.target.value)} dir="rtl" />
            </div>
          </div>

          {/* Species & Breed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Species *</Label>
              <select
                value={speciesId}
                onChange={(e) => { setSpeciesId(e.target.value); setBreedId(''); setCrossBreedId(''); }}
                className="w-full h-10 rounded-md border px-3 text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <option value="">Select species...</option>
                {speciesList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Breed</Label>
              <select
                value={breedId}
                onChange={(e) => setBreedId(e.target.value)}
                disabled={!speciesId}
                className="w-full h-10 rounded-md border px-3 text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <option value="">{speciesId ? 'Select breed...' : 'Select species first'}</option>
                {breedsList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>Cross Breed (optional)</Label>
            <select
              value={crossBreedId}
              onChange={(e) => setCrossBreedId(e.target.value)}
              disabled={!speciesId}
              className="w-full h-10 rounded-md border px-3 text-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              <option value="">None</option>
              {breedsList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Gender & Status */}
          <div className="space-y-3">
            <Label>Gender</Label>
            <RadioGroup value={gender} onValueChange={(val) => setGender(val as any)} className="flex gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem value="male" id="e-male" /><Label htmlFor="e-male" className="cursor-pointer">Male</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="female" id="e-female" /><Label htmlFor="e-female" className="cursor-pointer">Female</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="unknown" id="e-unknown" /><Label htmlFor="e-unknown" className="cursor-pointer">Unknown</Label></div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Reproductive Status</Label>
            <RadioGroup value={reproductiveStatus} onValueChange={(val) => setReproductiveStatus(val as any)} className="flex gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem value="intact" id="e-intact" /><Label htmlFor="e-intact" className="cursor-pointer">Intact</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="neutered" id="e-neutered" /><Label htmlFor="e-neutered" className="cursor-pointer">Neutered</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="spayed" id="e-spayed" /><Label htmlFor="e-spayed" className="cursor-pointer">Spayed</Label></div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Color</Label><Input value={color} onChange={(e) => setColor(e.target.value)} /></div>
            <div><Label>Distinctive Marks</Label><Input value={distinctiveMarks} onChange={(e) => setDistinctiveMarks(e.target.value)} /></div>
          </div>

          {/* Age */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-base font-semibold">Age Mode:</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: ageMode === 'exact' ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Exact</span>
                <Switch checked={ageMode === 'estimated'} onCheckedChange={(c) => setAgeMode(c ? 'estimated' : 'exact')} />
                <span className="text-sm" style={{ color: ageMode === 'estimated' ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Estimated</span>
              </div>
            </div>
            {ageMode === 'exact' ? (
              <div className="max-w-xs"><Label>Date of Birth</Label><Input type="date" max={new Date().toISOString().split('T')[0]} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></div>
            ) : (
              <div className="grid grid-cols-3 gap-4 max-w-md">
                <div><Label>Years</Label><Input type="number" min="0" max="100" value={ageYears} onChange={(e) => setAgeYears(e.target.value)} /></div>
                <div><Label>Months</Label><Input type="number" min="0" max="11" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} /></div>
                <div><Label>Days</Label><Input type="number" min="0" max="30" value={ageDays} onChange={(e) => setAgeDays(e.target.value)} /></div>
              </div>
            )}
          </div>

          {/* IDs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Passport Series</Label><Input value={passportSeries} onChange={(e) => setPassportSeries(e.target.value)} /></div>
            <div><Label>Insurance Number</Label><Input value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} /></div>
            <div><Label>Microchip ID</Label><Input value={microchipId} onChange={(e) => setMicrochipId(e.target.value)} /></div>
          </div>

          {/* Notes */}
          <div>
            <Label>Internal Notes <span className="text-xs ms-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--badge-danger-bg)', color: 'var(--color-text-danger)' }}>Always Private</span></Label>
            <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button type="button" variant="outline" className="btn-secondary" onClick={() => navigate(`/app/patients/${patientId}`)}>Cancel</Button>
            <Button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
