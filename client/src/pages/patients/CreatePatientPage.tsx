/**
 * CreatePatientPage — Create & Edit Patient Form
 *
 * Matches CreateUserPage pattern exactly:
 * - StyledIcon header with breadcrumbs
 * - Single form card (rounded-lg border, max-w-2xl)
 * - Each field has Label with StyledIcon
 * - Error banner + inline field errors
 * - Footer with Cancel + Save buttons
 *
 * Create mode: /app/patients/create
 * Edit mode:   /app/patients/:patientId/edit
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  Loader2, PawPrint, Dog, Heart, UserCircle, Palette, Fingerprint,
  Calendar, FileText, Shield, Search, Phone, Mail, Tag,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { useInterfaceStyle } from '@/contexts/InterfaceStyleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { PhoneInput, CountryCodeSelect, COUNTRY_DIAL_CODES } from '@/components/ui/PhoneInput';
import { Switch } from '@/components/ui/switch';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useSpeciesList } from '@/hooks/useSpecies';
import { useBreedsBySpecies } from '@/hooks/useBreeds';
import { useClientSearch, useCreateClient } from '@/hooks/useClients';
import { useCreatePatient, useUpdatePatient, usePatientDetail } from '@/hooks/usePatients';

import { useScreenPermission } from '@/hooks/useScreenPermission';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';

const SCREEN_CODE = 'PATIENT_LIST';

interface FormData {
  // Owner
  clientId: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPhoneCountry: string;
  // Pet
  name: string;
  speciesId: string;
  breedId: string;
  crossBreedId: string;
  gender: 'male' | 'female' | 'unknown';
  reproductiveStatus: 'intact' | 'neutered' | 'spayed';
  color: string;
  distinctiveMarks: string;
  // Age
  ageMode: 'exact' | 'estimated';
  dateOfBirth: string;
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  // IDs
  passportSeries: string;
  insuranceNumber: string;
  microchipId: string;
  internalNotes: string;
}

const initialFormData: FormData = {
  clientId: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerPhoneCountry: 'SA',
  name: '',
  speciesId: '',
  breedId: '',
  crossBreedId: '',
  gender: 'unknown',
  reproductiveStatus: 'intact',
  color: '',
  distinctiveMarks: '',
  ageMode: 'exact',
  dateOfBirth: '',
  ageYears: '',
  ageMonths: '',
  ageDays: '',
  passportSeries: '',
  insuranceNumber: '',
  microchipId: '',
  internalNotes: '',
};

export default function CreatePatientPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { patientId } = useParams<{ patientId: string }>();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  const isEditMode = !!patientId;
  const { interfaceStyle } = useInterfaceStyle();

  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const createClient = useCreateClient();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formLoaded, setFormLoaded] = useState(false);

  // Owner search
  const [ownerSearch, setOwnerSearch] = useState('');
  const [isNewOwner, setIsNewOwner] = useState(false);
  const [debouncedOwnerSearch, setDebouncedOwnerSearch] = useState('');
  const [showOwnerResults, setShowOwnerResults] = useState(false);

  // Debounce owner search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOwnerSearch(ownerSearch), 300);
    return () => clearTimeout(timer);
  }, [ownerSearch]);

  const { data: ownerResults } = useClientSearch(debouncedOwnerSearch);
  const { data: existingPatient, isLoading: isLoadingPatient } = usePatientDetail(patientId);

  // Data hooks
  const { data: speciesData } = useSpeciesList({ limit: 100, isActive: 'true' });
  const { data: breedsData } = useBreedsBySpecies(formData.speciesId || undefined);

  const speciesList = speciesData?.data ?? [];
  const breedsList = breedsData?.data ?? [];

  // Species options for dropdown
  const speciesOptions = useMemo(() => {
    return speciesList.map(s => ({ value: s.id, label: s.name }));
  }, [speciesList]);

  // Breed options for dropdown
  const breedOptions = useMemo(() => {
    return breedsList.map(b => ({ value: b.id, label: b.name }));
  }, [breedsList]);

  // Gender options — adapt to Interface Style
  const genderOptions = useMemo(() => {
    if (interfaceStyle === 'playful') {
      return [
        { value: 'male', label: '\u2642\uFE0F ' + t('pets.male') },
        { value: 'female', label: '\u2640\uFE0F ' + t('pets.female') },
        { value: 'unknown', label: '\u2754 ' + t('pets.unknown') },
      ];
    }
    if (interfaceStyle === 'elegant') {
      return [
        { value: 'male', label: t('pets.male') },
        { value: 'female', label: t('pets.female') },
        { value: 'unknown', label: t('pets.unknown') },
      ];
    }
    // default — standard symbols
    return [
      { value: 'male', label: '\u2642 ' + t('pets.male') },
      { value: 'female', label: '\u2640 ' + t('pets.female') },
      { value: 'unknown', label: '\u2014 ' + t('pets.unknown') },
    ];
  }, [interfaceStyle, t]);

  // Reproductive status options — adapt to Interface Style
  const reproductiveOptions = useMemo(() => {
    if (interfaceStyle === 'playful') {
      return [
        { value: 'intact', label: '\u{1F7E2} ' + t('pets.intact') },
        { value: 'neutered', label: '\u2702\uFE0F ' + t('pets.neutered') },
        { value: 'spayed', label: '\u2702\uFE0F ' + t('pets.spayed') },
      ];
    }
    if (interfaceStyle === 'elegant') {
      return [
        { value: 'intact', label: t('pets.intact') },
        { value: 'neutered', label: t('pets.neutered') },
        { value: 'spayed', label: t('pets.spayed') },
      ];
    }
    // default — standard symbols
    return [
      { value: 'intact', label: '\u25CF ' + t('pets.intact') },
      { value: 'neutered', label: '\u2702 ' + t('pets.neutered') },
      { value: 'spayed', label: '\u2702 ' + t('pets.spayed') },
    ];
  }, [interfaceStyle, t]);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && existingPatient && !formLoaded) {
      setFormData({
        clientId: existingPatient.clientId || '',
        ownerFirstName: existingPatient.ownerFirstName || '',
        ownerLastName: existingPatient.ownerLastName || '',
        ownerEmail: existingPatient.ownerEmail || '',
        ownerPhone: existingPatient.ownerPhone || '',
        ownerPhoneCountry: 'SA',
        name: existingPatient.name || '',
        speciesId: existingPatient.speciesId || '',
        breedId: existingPatient.breedId || '',
        crossBreedId: existingPatient.crossBreedId || '',
        gender: (existingPatient.gender as FormData['gender']) || 'unknown',
        reproductiveStatus: (existingPatient.reproductiveStatus as FormData['reproductiveStatus']) || 'intact',
        color: existingPatient.color || '',
        distinctiveMarks: existingPatient.distinctiveMarks || '',
        ageMode: existingPatient.dateOfBirth ? 'exact' : 'estimated',
        dateOfBirth: existingPatient.dateOfBirth || '',
        ageYears: existingPatient.ageYears?.toString() || '',
        ageMonths: existingPatient.ageMonths?.toString() || '',
        ageDays: existingPatient.ageDays?.toString() || '',
        passportSeries: existingPatient.passportSeries || '',
        insuranceNumber: existingPatient.insuranceNumber || '',
        microchipId: existingPatient.microchipId || '',
        internalNotes: existingPatient.internalNotes || '',
      });
      setIsNewOwner(false);
      setFormLoaded(true);
    }
  }, [isEditMode, existingPatient, formLoaded]);

  // Field updater
  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  // Handle owner selection
  const handleSelectOwner = useCallback((client: { id: string; firstName: string; lastName: string; email?: string; phone?: string }) => {
    setFormData(prev => ({
      ...prev,
      clientId: client.id,
      ownerFirstName: client.firstName,
      ownerLastName: client.lastName,
      ownerEmail: client.email || '',
      ownerPhone: client.phone || '',
    }));
    setIsNewOwner(false);
    setShowOwnerResults(false);
    setOwnerSearch(`${client.firstName} ${client.lastName}`);
  }, []);

  // Handle new owner toggle
  const handleNewOwner = useCallback(() => {
    setIsNewOwner(true);
    setShowOwnerResults(false);
    setFormData(prev => ({ ...prev, clientId: '' }));
  }, []);

  // Validate
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) newErrors.name = t('pets.required');
    if (!formData.speciesId) newErrors.speciesId = t('pets.required');

    // Owner validation
    if (!isEditMode) {
      if (!formData.clientId && !isNewOwner) {
        newErrors.clientId = t('pets.selectOwnerOrCreate');
      }
      if (isNewOwner && !formData.ownerFirstName.trim()) {
        newErrors.ownerFirstName = t('pets.required');
      }
      if (isNewOwner && !formData.ownerLastName.trim()) {
        newErrors.ownerLastName = t('pets.required');
      }
      if (isNewOwner && formData.ownerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail.trim())) {
        newErrors.ownerEmail = t('pets.invalidEmail');
      }
    }

    // Age: require either exact date or estimated age
    if (formData.ageMode === 'exact' && !formData.dateOfBirth) {
      newErrors.dateOfBirth = t('pets.dateOfBirthRequired');
    }
    if (formData.ageMode === 'estimated') {
      const y = parseInt(formData.ageYears) || 0;
      const m = parseInt(formData.ageMonths) || 0;
      const d = parseInt(formData.ageDays) || 0;
      if (y === 0 && m === 0 && d === 0) {
        newErrors.ageYears = t('pets.enterAgeValue');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditMode, isNewOwner, t]);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      let clientId = formData.clientId;

      // Step 1: Create client if new
      if (!isEditMode && isNewOwner) {
        // Build phone with country dial code
        const rawPhone = formData.ownerPhone.trim();
        const dialCode = COUNTRY_DIAL_CODES[formData.ownerPhoneCountry] || '';
        const fullPhone = rawPhone ? `${dialCode}${rawPhone}` : undefined;

        const newClient = await createClient.mutateAsync({
          firstName: formData.ownerFirstName.trim(),
          lastName: formData.ownerLastName.trim(),
          email: formData.ownerEmail.trim() || undefined,
          phone: fullPhone,
        });
        clientId = newClient.id;
      }

      // Step 2: Create or update patient
      const patientPayload = {
        clientId,
        speciesId: formData.speciesId,
        breedId: formData.breedId || null,
        crossBreedId: formData.crossBreedId || null,
        name: formData.name.trim(),
        gender: formData.gender,
        reproductiveStatus: formData.reproductiveStatus,
        color: formData.color.trim() || undefined,
        distinctiveMarks: formData.distinctiveMarks.trim() || undefined,
        dateOfBirth: formData.ageMode === 'exact' && formData.dateOfBirth ? formData.dateOfBirth : null,
        ageYears: formData.ageMode === 'estimated' && formData.ageYears ? parseInt(formData.ageYears) : null,
        ageMonths: formData.ageMode === 'estimated' && formData.ageMonths ? parseInt(formData.ageMonths) : null,
        ageDays: formData.ageMode === 'estimated' && formData.ageDays ? parseInt(formData.ageDays) : null,
        passportSeries: formData.passportSeries.trim() || undefined,
        insuranceNumber: formData.insuranceNumber.trim() || undefined,
        microchipId: formData.microchipId.trim() || undefined,
        internalNotes: formData.internalNotes.trim() || undefined,
      };

      if (isEditMode) {
        await updatePatient.mutateAsync({ id: patientId!, ...patientPayload });
        showToast('success', t('pets.updatedSuccess'));
      } else {
        await createPatient.mutateAsync(patientPayload);
        showToast('success', t('pets.createdSuccess'));
      }

      navigate('/app/patients');
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        // Map server field names → form field names (client fields prefixed with 'owner')
        const SERVER_TO_FORM: Record<string, keyof FormData> = {
          firstName: 'ownerFirstName',
          lastName: 'ownerLastName',
          email: 'ownerEmail',
          phone: 'ownerPhone',
        };
        const mappedErrors: Partial<Record<keyof FormData, string>> = {};
        for (const [field, msg] of Object.entries(apiError.fieldErrors)) {
          const formField = SERVER_TO_FORM[field] || field;
          mappedErrors[formField as keyof FormData] = msg;
        }
        setErrors(mappedErrors);
        // Show specific field errors instead of generic message
        const errorMessages = Object.values(apiError.fieldErrors);
        setSubmitError(errorMessages.join('. '));
      } else {
        setSubmitError(apiError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validate, navigate, isEditMode, patientId, isNewOwner, createClient, createPatient, updatePatient, showToast, t]);

  const pageTitle = isEditMode ? t('pets.editPet') : t('pets.createPet');

  // Permission guard
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to="/app/patients" replace />;
  }

  if (isEditMode && isLoadingPatient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={PawPrint} emoji="🐾" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold text-[var(--color-text)]">
            {pageTitle}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Form Card */}
      <div
        className="rounded-lg border max-w-2xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Error banner */}
        {submitError && (
          <div
            className="px-5 py-3 text-sm border-b"
            style={{
              backgroundColor: 'var(--badge-danger-bg)',
              borderColor: 'var(--badge-danger-border)',
              color: 'var(--color-text-danger)',
            }}
          >
            {submitError}
          </div>
        )}

        {/* Fields */}
        <div className="px-5 py-5 space-y-4">

          {/* ─── OWNER SECTION ─── */}
          {!isEditMode && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={UserCircle} emoji="👤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('pets.ownerClient')}
                </Label>
                {!isNewOwner ? (
                  <div className="relative" data-testid="ownerClient">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    <Input
                      value={ownerSearch}
                      onChange={(e) => { setOwnerSearch(e.target.value); setShowOwnerResults(true); }}
                      onFocus={() => ownerSearch.length >= 2 && setShowOwnerResults(true)}
                      placeholder={t('pets.searchOwnerPlaceholder')}
                      className="pl-10 h-9"
                      error={!!errors.clientId}
                    />
                    {/* Owner search results dropdown */}
                    {showOwnerResults && ownerResults?.data && ownerResults.data.length > 0 && (
                      <div
                        className="absolute top-full mt-1 w-full z-50 rounded-md border shadow-lg max-h-48 overflow-y-auto"
                        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                      >
                        {ownerResults.data.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectOwner(client)}
                            className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--color-surface-hover)]"
                            style={{ color: 'var(--color-text)' }}
                          >
                            <div className="font-medium">{client.firstName} {client.lastName}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {client.email || client.phone || client.code}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {formData.clientId && (
                      <div className="mt-1 text-xs" style={{ color: 'var(--color-accent)' }}>
                        {t('pets.selectedOwner')}: {formData.ownerFirstName} {formData.ownerLastName}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs" style={{ color: 'var(--color-accent)' }}>
                    {t('pets.creatingNewClient')}
                  </div>
                )}
                <div className="flex gap-2 mt-1">
                  {!isNewOwner ? (
                    <button
                      type="button"
                      onClick={handleNewOwner}
                      className="text-xs font-medium px-2 py-1 rounded transition-colors"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {t('pets.createNewClient')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setIsNewOwner(false); setOwnerSearch(''); }}
                      className="text-xs font-medium px-2 py-1 rounded transition-colors"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {t('pets.searchExisting')}
                    </button>
                  )}
                </div>
                {errors.clientId && (
                  <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.clientId}</p>
                )}
              </div>

              {/* New owner fields */}
              {isNewOwner && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <StyledIcon icon={UserCircle} emoji="👤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        {t('pets.ownerFirstName')}
                      </Label>
                      <Input
                        value={formData.ownerFirstName}
                        onChange={(e) => updateField('ownerFirstName', e.target.value)}
                        placeholder={t('pets.firstNamePlaceholder')}
                        error={!!errors.ownerFirstName}
                        className="h-9"
                      />
                      {errors.ownerFirstName && (
                        <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.ownerFirstName}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <StyledIcon icon={UserCircle} emoji="👤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        {t('pets.ownerLastName')}
                      </Label>
                      <Input
                        value={formData.ownerLastName}
                        onChange={(e) => updateField('ownerLastName', e.target.value)}
                        placeholder={t('pets.lastNamePlaceholder')}
                        error={!!errors.ownerLastName}
                        className="h-9"
                      />
                      {errors.ownerLastName && (
                        <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.ownerLastName}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Mail} emoji="📧" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {t('pets.ownerEmail')}
                    </Label>
                    <Input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => updateField('ownerEmail', e.target.value)}
                      placeholder={t('pets.emailPlaceholder')}
                      error={!!errors.ownerEmail}
                      className="h-9"
                    />
                    {errors.ownerEmail && (
                      <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.ownerEmail}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Phone} emoji="📱" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      {t('pets.ownerPhoneLabel')}
                    </Label>
                    <div className="flex gap-2">
                      <CountryCodeSelect
                        value={formData.ownerPhoneCountry}
                        onChange={(code) => updateField('ownerPhoneCountry', code)}
                        className="w-[140px] flex-shrink-0"
                      />
                      <PhoneInput
                        countryCode={formData.ownerPhoneCountry}
                        value={formData.ownerPhone}
                        onChange={(val) => updateField('ownerPhone', val)}
                        placeholder={t('pets.phonePlaceholder')}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }} />
            </>
          )}

          {/* ─── PET IDENTITY ─── */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={PawPrint} emoji="🐾" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              {t('pets.petName')}
            </Label>
            <Input
              data-testid="petName"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={t('pets.petNamePlaceholder')}
              error={!!errors.name}
              className="h-9"
            />
            {errors.name && (
              <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.name}</p>
            )}
          </div>

          {/* ─── SPECIES & BREED ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Dog} emoji="🐕" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.species')}
              </Label>
              <div data-testid="species">
                <SimpleSelect
                  value={formData.speciesId}
                  onValueChange={(val) => {
                    updateField('speciesId', val);
                    setFormData(prev => ({ ...prev, breedId: '', crossBreedId: '' }));
                  }}
                  options={speciesOptions}
                  placeholder={t('pets.selectSpecies')}
                  error={!!errors.speciesId}
                />
              </div>
              {errors.speciesId && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.speciesId}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Heart} emoji="🏷️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.breed')}
              </Label>
              {breedOptions.length > 0 ? (
                <SimpleSelect
                  value={formData.breedId}
                  onValueChange={(val) => updateField('breedId', val)}
                  options={[{ value: '', label: t('pets.selectBreedDots') }, ...breedOptions]}
                  placeholder={formData.speciesId ? t('pets.selectBreed') : t('pets.selectSpeciesFirst')}
                  disabled={!formData.speciesId}
                />
              ) : (
                <div
                  className="flex items-center h-9 px-3 rounded-md border text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {formData.speciesId ? t('pets.noBreeds') : t('pets.selectSpeciesFirst')}
                </div>
              )}
            </div>
          </div>

          {/* Cross Breed */}
          {breedOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Heart} emoji="🔀" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.crossBreed')}
              </Label>
              <SimpleSelect
                value={formData.crossBreedId}
                onValueChange={(val) => updateField('crossBreedId', val)}
                options={[{ value: '', label: t('pets.none') }, ...breedOptions]}
                placeholder={t('pets.none')}
                disabled={!formData.speciesId}
              />
            </div>
          )}

          {/* ─── GENDER & REPRODUCTIVE STATUS ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Tag} emoji="🏷️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.gender')}
              </Label>
              <SimpleSelect
                value={formData.gender}
                onValueChange={(val) => updateField('gender', val)}
                options={genderOptions}
                placeholder={t('pets.selectGender')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Shield} emoji="🔒" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.reproductiveStatus')}
              </Label>
              <SimpleSelect
                value={formData.reproductiveStatus}
                onValueChange={(val) => updateField('reproductiveStatus', val)}
                options={reproductiveOptions}
                placeholder={t('pets.selectReproductiveStatus')}
              />
            </div>
          </div>

          {/* ─── COLOR & MARKS ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Palette} emoji="🎨" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.color')}
              </Label>
              <Input
                value={formData.color}
                onChange={(e) => updateField('color', e.target.value)}
                placeholder={t('pets.colorPlaceholder')}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Fingerprint} emoji="🔍" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.distinctiveMarks')}
              </Label>
              <Input
                value={formData.distinctiveMarks}
                onChange={(e) => updateField('distinctiveMarks', e.target.value)}
                placeholder={t('pets.marksPlaceholder')}
                className="h-9"
              />
            </div>
          </div>

          {/* ─── AGE ─── */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              {t('pets.age')}
            </Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: formData.ageMode === 'exact' ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
                  {t('pets.exact')}
                </span>
                <Switch
                  checked={formData.ageMode === 'estimated'}
                  onCheckedChange={(c) => updateField('ageMode', c ? 'estimated' : 'exact')}
                />
                <span className="text-sm" style={{ color: formData.ageMode === 'estimated' ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
                  {t('pets.estimated')}
                </span>
              </div>
            </div>
            {formData.ageMode === 'exact' ? (
              <>
                <Input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  error={!!errors.dateOfBirth}
                  className="h-9 max-w-xs"
                />
                {errors.dateOfBirth && (
                  <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.dateOfBirth}</p>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 max-w-md">
                  <div>
                    <Label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('pets.years')}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.ageYears}
                      onChange={(e) => updateField('ageYears', e.target.value)}
                      error={!!errors.ageYears}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('pets.months')}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="11"
                      value={formData.ageMonths}
                      onChange={(e) => updateField('ageMonths', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('pets.days')}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={formData.ageDays}
                      onChange={(e) => updateField('ageDays', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                {errors.ageYears && (
                  <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.ageYears}</p>
                )}
              </>
            )}
          </div>

          {/* ─── IDs & DOCUMENTS ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={FileText} emoji="📄" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.passportSeries')}
              </Label>
              <Input
                value={formData.passportSeries}
                onChange={(e) => updateField('passportSeries', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Shield} emoji="🛡️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.insuranceNumber')}
              </Label>
              <Input
                value={formData.insuranceNumber}
                onChange={(e) => updateField('insuranceNumber', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Fingerprint} emoji="📡" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('pets.microchipId')}
              </Label>
              <Input
                value={formData.microchipId}
                onChange={(e) => updateField('microchipId', e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* ─── NOTES ─── */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={FileText} emoji="📝" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              {t('pets.internalNotes')}
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--badge-danger-bg)', color: 'var(--color-text-danger)' }}
              >
                {t('pets.alwaysPrivate')}
              </span>
            </Label>
            <Textarea
              value={formData.internalNotes}
              onChange={(e) => updateField('internalNotes', e.target.value)}
              rows={3}
              placeholder={t('pets.notesPlaceholder')}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-end gap-3 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/app/patients')}
          >
            {t('common.cancel')}
          </Button>
          <Button
            data-testid="submitBtn"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || createPatient.isPending || updatePatient.isPending}
            loading={isSubmitting || createPatient.isPending || updatePatient.isPending}
          >
            {isEditMode ? t('common.save') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
