/**
 * PatientsListPage — Patient list matching UsersListPage pattern exactly
 *
 * Uses AdvancedDataTable, Card search/filters, StyledIcon headers,
 * EmptyState/ErrorState, Pagination, and useScreenPermission.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  PawPrint, Plus, Search, Loader2, Filter, ChevronDown,
  Pencil, Ban, CheckCircle2, Tag,
  Activity, Settings, Heart, Dog, UserCircle, Hash,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { useInterfaceStyle } from '@/contexts/InterfaceStyleContext';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { AdvancedDataTable } from '@/components/ui/AdvancedDataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/Pagination';
import { usePatientsList, type Patient } from '@/hooks/usePatients';
import { useSpeciesList } from '@/hooks/useSpecies';
import { useBreedsBySpecies } from '@/hooks/useBreeds';
import { useScopePath } from '@/hooks/useScopePath';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useScreenPermission } from '@/hooks/useScreenPermission';

const getStatusStyle = (isActive: boolean) => {
  if (isActive) {
    return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
  }
  return { backgroundColor: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderColor: 'var(--badge-danger-border)' };
};

const getGenderStyle = (gender: string) => {
  switch (gender) {
    case 'male':
      return { backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', borderColor: 'var(--badge-info-border)' };
    case 'female':
      return { backgroundColor: 'color-mix(in srgb, #ec4899 15%, transparent)', color: '#ec4899', borderColor: 'color-mix(in srgb, #ec4899 30%, transparent)' };
    default:
      return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' };
  }
};

const SCREEN_CODE = 'PATIENT_LIST';

export default function PatientsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { getPath } = useScopePath();
  const { canAccess, canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { interfaceStyle } = useInterfaceStyle();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [togglingPatientId, setTogglingPatientId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [selectedBreedId, setSelectedBreedId] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Fetch species for filter dropdown
  const { data: speciesData } = useSpeciesList({ limit: 100, isActive: 'true' });
  // Fetch breeds cascading from selected species
  const { data: breedsData } = useBreedsBySpecies(selectedSpeciesId || undefined);

  // Debounce search — 300ms per CLAUDE.md
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const patientFilters = useMemo(() => {
    const filters: {
      page?: number;
      limit?: number;
      search?: string;
      speciesId?: string;
      breedId?: string;
      gender?: 'male' | 'female' | 'unknown';
      isActive?: string;
    } = {};
    filters.page = page;
    filters.limit = pageSize;
    if (debouncedSearch) filters.search = debouncedSearch;
    if (selectedSpeciesId) filters.speciesId = selectedSpeciesId;
    if (selectedBreedId) filters.breedId = selectedBreedId;
    if (selectedGender) filters.gender = selectedGender as 'male' | 'female' | 'unknown';
    if (selectedStatus) filters.isActive = selectedStatus;
    return filters;
  }, [page, pageSize, debouncedSearch, selectedSpeciesId, selectedBreedId, selectedGender, selectedStatus]);

  const { data: patientsResponse, isLoading, error } = usePatientsList(patientFilters);
  const patients = patientsResponse?.data ?? [];
  const pagination = patientsResponse?.pagination;
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedSpeciesId, selectedBreedId, selectedGender, selectedStatus]);

  // Reset breed when species changes
  useEffect(() => {
    setSelectedBreedId('');
  }, [selectedSpeciesId]);

  const speciesOptions = useMemo(() => {
    if (!speciesData?.data) return [];
    return speciesData.data.map(s => ({ value: s.id, label: s.name }));
  }, [speciesData]);

  const breedOptions = useMemo(() => {
    if (!breedsData?.data) return [];
    return breedsData.data.map(b => ({ value: b.id, label: b.name }));
  }, [breedsData]);

  const genderOptions = useMemo(() => {
    if (interfaceStyle === 'playful') {
      return [
        { value: '', label: t('pets.allGenders') },
        { value: 'male', label: '\u2642\uFE0F ' + t('pets.male') },
        { value: 'female', label: '\u2640\uFE0F ' + t('pets.female') },
        { value: 'unknown', label: '\u2754 ' + t('pets.unknown') },
      ];
    }
    if (interfaceStyle === 'elegant') {
      return [
        { value: '', label: t('pets.allGenders') },
        { value: 'male', label: t('pets.male') },
        { value: 'female', label: t('pets.female') },
        { value: 'unknown', label: t('pets.unknown') },
      ];
    }
    // default — standard symbols
    return [
      { value: '', label: t('pets.allGenders') },
      { value: 'male', label: '\u2642 ' + t('pets.male') },
      { value: 'female', label: '\u2640 ' + t('pets.female') },
      { value: 'unknown', label: '\u2014 ' + t('pets.unknown') },
    ];
  }, [interfaceStyle, t]);

  const handleEditPatient = useCallback((patient: Patient) => {
    navigate(`/app/patients/${patient.id}/edit`);
  }, [navigate]);

  const handleToggleStatus = useCallback(async (patient: Patient) => {
    setTogglingPatientId(patient.id);
    try {
      await apiClient.put(`/tenant/patients/${patient.id}`, { isActive: !patient.isActive });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch {
      // silently fail - user will see the state didn't change
    } finally {
      setTogglingPatientId(null);
    }
  }, [queryClient]);

  const activeFilterCount = [selectedSpeciesId, selectedBreedId, selectedGender, selectedStatus].filter(Boolean).length;

  const patientColumns: ColumnDef<Patient>[] = useMemo(() => {
    const cols: ColumnDef<Patient>[] = [
      {
        id: 'code',
        accessorKey: 'code',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
            {t('common.code')}
          </span>
        ),
        size: 130,
        minSize: 100,
        maxSize: 180,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={PawPrint} emoji="🐾" className="w-3.5 h-3.5" />
            {t('common.name')}
          </span>
        ),
        size: 180,
        minSize: 140,
        maxSize: 280,
        cell: ({ row }) => (
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'species',
        accessorKey: 'speciesName',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Dog} emoji="🐕" className="w-3.5 h-3.5" />
            {t('pets.species')}
          </span>
        ),
        size: 130,
        minSize: 100,
        maxSize: 200,
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {(getValue() as string) || '-'}
          </span>
        ),
      },
      {
        id: 'breed',
        accessorKey: 'breedName',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Heart} emoji="🏷️" className="w-3.5 h-3.5" />
            {t('pets.breed')}
          </span>
        ),
        size: 150,
        minSize: 100,
        maxSize: 240,
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {(getValue() as string) || '-'}
          </span>
        ),
      },
      {
        id: 'owner',
        accessorKey: 'ownerName',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={UserCircle} emoji="👤" className="w-3.5 h-3.5" />
            {t('pets.ownerName')}
          </span>
        ),
        size: 180,
        minSize: 130,
        maxSize: 280,
        cell: ({ row }) => {
          const owner = row.original.ownerName ||
            [row.original.ownerFirstName, row.original.ownerLastName].filter(Boolean).join(' ');
          return (
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {owner || '-'}
            </span>
          );
        },
      },
      {
        id: 'clientCode',
        accessorKey: 'clientCode',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
            {t('pets.ownerCode')}
          </span>
        ),
        size: 130,
        minSize: 100,
        maxSize: 180,
        cell: ({ getValue }) => {
          const code = getValue() as string | undefined;
          return code ? (
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {code}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>-</span>
          );
        },
      },
      {
        id: 'gender',
        accessorKey: 'gender',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Tag} emoji="🏷️" className="w-3.5 h-3.5" />
            {t('pets.gender')}
          </span>
        ),
        size: 100,
        minSize: 80,
        maxSize: 130,
        cell: ({ getValue }) => {
          const gender = getValue() as string;
          return (
            <Badge className="border text-xs capitalize" style={getGenderStyle(gender)}>
              {gender === 'male' ? t('pets.male') : gender === 'female' ? t('pets.female') : t('pets.unknown')}
            </Badge>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'isActive',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
            {t('common.status')}
          </span>
        ),
        size: 100,
        minSize: 80,
        maxSize: 130,
        cell: ({ row }) => {
          const isActive = row.original.isActive !== false;
          return (
            <Badge className="border text-xs" style={getStatusStyle(isActive)}>
              {isActive ? t('common.active') : t('common.inactive')}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Settings} emoji="⚙️" className="w-3.5 h-3.5" />
            {t('common.actions')}
          </span>
        ),
        size: 100,
        minSize: 80,
        maxSize: 120,
        enableResizing: false,
        cell: ({ row }) => {
          const patient = row.original;
          const isActive = patient.isActive !== false;
          const isToggling = togglingPatientId === patient.id;

          if (!canModify) return null;

          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleEditPatient(patient); }}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                title={t('pets.editAction')}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggleStatus(patient); }}
                disabled={isToggling}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                  e.currentTarget.style.color = isActive ? 'var(--badge-danger-text)' : 'var(--badge-success-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
                title={isActive ? t('pets.deactivateAction') : t('pets.activateAction')}
              >
                {isToggling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isActive ? (
                  <Ban className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </button>
            </div>
          );
        },
      },
    ];

    return cols;
  }, [togglingPatientId, handleEditPatient, handleToggleStatus, canModify, t]);

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to={getPath('dashboard')} replace />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledIcon icon={PawPrint} emoji="🐾" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {t('pets.title')}
            </h1>
          </div>
          {canModify && (
            <Link to="/app/patients/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('pets.createPet')}
              </Button>
            </Link>
          )}
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                <Input
                  placeholder={t('pets.searchPets')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: filtersOpen ? 'var(--color-accent-light)' : 'var(--color-surface)',
                  borderColor: filtersOpen ? 'var(--color-accent)' : 'var(--color-border)',
                  color: filtersOpen ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">{t('pets.filters')}</span>
                {activeFilterCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' }}
                  >
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {filtersOpen && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <div className="flex gap-4 flex-wrap">
                  <div className="w-48">
                    <SimpleSelect
                      value={selectedSpeciesId}
                      onValueChange={(val) => setSelectedSpeciesId(val)}
                      options={[{ value: '', label: t('pets.allSpecies') }, ...speciesOptions]}
                      placeholder={t('pets.allSpecies')}
                    />
                  </div>
                  {breedOptions.length > 0 && (
                    <div className="w-48">
                      <SimpleSelect
                        value={selectedBreedId}
                        onValueChange={(val) => setSelectedBreedId(val)}
                        options={[{ value: '', label: t('pets.allBreeds') }, ...breedOptions]}
                        placeholder={t('pets.allBreeds')}
                      />
                    </div>
                  )}
                  <div className="w-40">
                    <SimpleSelect
                      value={selectedGender}
                      onValueChange={(val) => setSelectedGender(val)}
                      options={genderOptions}
                      placeholder={t('pets.allGenders')}
                    />
                  </div>
                  <div className="w-40">
                    <SimpleSelect
                      value={selectedStatus}
                      onValueChange={(val) => setSelectedStatus(val)}
                      options={[
                        { value: '', label: t('pets.allStatus') },
                        { value: 'true', label: t('common.active') },
                        { value: 'false', label: t('common.inactive') },
                      ]}
                      placeholder={t('pets.allStatus')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} columns={8} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={t('common.operationFailed')}
              message={(error as Error)?.message || t('common.noResults')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : patients.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={PawPrint}
              title={debouncedSearch ? t('common.noResults') : t('common.noData')}
              description={debouncedSearch ? t('common.noResults') : t('pets.subtitle')}
              action={!debouncedSearch ? {
                label: t('pets.createPet'),
                onClick: () => navigate('/app/patients/create'),
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : (
          <>
            <AdvancedDataTable<Patient>
              tableId="app-patients-list-table"
              data={patients}
              columns={patientColumns}
              autoHeight={true}
              minHeight={400}
              rowHeight={48}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={false}
              emptyMessage={t('common.noData')}
            />

            {pagination && pagination.totalPages > 0 && (
              <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                  pageSizeOptions={[10, 50, 100]}
                  showPageSize
                  showTotal
                  totalItems={pagination.total}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
