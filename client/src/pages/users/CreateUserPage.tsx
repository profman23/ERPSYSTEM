import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateUser, useTenants, useBusinessLines, useBranches } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';

const scopeOptions = [
  { value: 'branch', label: 'Branch - Access to single branch' },
  { value: 'business_line', label: 'Business Line - Access to all branches in business line' },
  { value: 'tenant', label: 'Tenant - Access to entire organization' },
];

const roleOptions = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'veterinarian', label: 'Veterinarian' },
  { value: 'technician', label: 'Technician' },
  { value: 'receptionist', label: 'Receptionist' },
];

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const createUser = useCreateUser();

  const branchIdFromParams = searchParams.get('branchId');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    code: '',
    role: 'staff',
    accessScope: 'branch',
    tenantId: currentUser?.tenantId || '',
    businessLineId: '',
    branchId: branchIdFromParams || '',
  });
  
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  const { data: tenants } = useTenants();
  const { data: businessLines } = useBusinessLines(formData.tenantId || undefined);
  const { data: branches } = useBranches(formData.businessLineId || undefined);

  useEffect(() => {
    if (!formData.tenantId && tenants && tenants.length > 0) {
      setFormData(prev => ({ ...prev, tenantId: tenants[0].id }));
    }
  }, [tenants]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, businessLineId: '', branchId: '' }));
  }, [formData.tenantId]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, branchId: '' }));
  }, [formData.businessLineId]);

  const tenantOptions = useMemo(() => {
    if (!tenants) return [];
    return tenants.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [tenants]);

  const businessLineOptions = useMemo(() => {
    if (!businessLines) return [];
    return businessLines.map(bl => ({ value: bl.id, label: `${bl.name} (${bl.code})` }));
  }, [businessLines]);

  const branchOptions = useMemo(() => {
    if (!branches) return [];
    return branches.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }));
  }, [branches]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'password' || field === 'confirmPassword') {
      setPasswordError(null);
    }
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    if (!formData.branchId) {
      setError('Please select a branch');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);

    if (!validateForm()) return;

    try {
      await createUser.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        code: formData.code || undefined,
        role: formData.role,
        accessScope: formData.accessScope,
        branchId: formData.branchId,
      });
      navigate('/users');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            Create User
          </h1>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Add a new user to the system
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Enter the basic details for the new user</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Repeat password"
                  className={passwordError ? 'border-red-500' : ''}
                />
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">User Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="Optional identifier"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Access & Permissions</CardTitle>
            <CardDescription>Configure user access scope and organization assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="accessScope">Access Scope</Label>
              <Select
                value={formData.accessScope}
                onChange={(e) => handleChange('accessScope', e.target.value)}
              >
                {scopeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentUser?.accessScope === 'system' && (
                <div className="space-y-2">
                  <Label>Tenant *</Label>
                  <Select
                    value={formData.tenantId}
                    onChange={(e) => handleChange('tenantId', e.target.value)}
                  >
                    <option value="">Select Tenant</option>
                    {tenantOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Business Line *</Label>
                <Select
                  value={formData.businessLineId}
                  onChange={(e) => handleChange('businessLineId', e.target.value)}
                  disabled={!formData.tenantId}
                >
                  <option value="">Select Business Line</option>
                  {businessLineOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch *</Label>
                <Select
                  value={formData.branchId}
                  onChange={(e) => handleChange('branchId', e.target.value)}
                  disabled={!formData.businessLineId}
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link to="/users">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-[#2563EB] hover:bg-[#1E40AF]"
            disabled={createUser.isPending}
          >
            {createUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create User
          </Button>
        </div>
      </form>
    </div>
  );
}
