import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Shield, Building2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateUser, useTenants, useBusinessLines, useBranches } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { useScopePath } from '@/hooks/useScopePath';
import { apiClient } from '@/lib/api';

type UserType = 'system' | 'tenant_admin' | 'regular';

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

const systemRoleOptions = [
  { value: 'SYSTEM_ADMIN', label: 'System Administrator - Full platform access' },
  { value: 'SUPPORT_STAFF', label: 'Support Staff - Customer support access' },
  { value: 'BILLING_STAFF', label: 'Billing Staff - Billing management access' },
];

function getUserTypeInfo(type: UserType) {
  switch (type) {
    case 'system':
      return {
        icon: Shield,
        title: 'Create System User',
        description: 'Platform-level user with system-wide access',
        color: 'bg-purple-100 text-purple-700',
        borderColor: 'border-purple-200',
      };
    case 'tenant_admin':
      return {
        icon: Building2,
        title: 'Create Tenant Admin',
        description: 'Organization administrator with full tenant access',
        color: 'bg-blue-100 text-blue-700',
        borderColor: 'border-blue-200',
      };
    default:
      return {
        icon: Users,
        title: 'Create User',
        description: 'Add a new user to the system',
        color: 'bg-teal-100 text-teal-700',
        borderColor: 'border-teal-200',
      };
  }
}

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { getPath } = useScopePath();
  const createUser = useCreateUser();

  const userTypeParam = searchParams.get('type') as UserType | null;
  const branchIdFromParams = searchParams.get('branchId');
  
  const userType: UserType = currentUser?.accessScope === 'system' && userTypeParam 
    ? userTypeParam 
    : 'regular';
  
  const typeInfo = getUserTypeInfo(userType);
  const TypeIcon = typeInfo.icon;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    code: '',
    role: 'staff',
    roleCode: 'SYSTEM_ADMIN',
    accessScope: 'branch',
    tenantId: currentUser?.tenantId || '',
    businessLineId: '',
    branchId: branchIdFromParams || '',
  });
  
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: tenants } = useTenants();
  const { data: businessLines } = useBusinessLines(formData.tenantId || undefined);
  const { data: branches } = useBranches(formData.businessLineId || undefined);

  const nonSystemTenants = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => t.code !== 'SYSTEM');
  }, [tenants]);

  useEffect(() => {
    if (userType === 'regular' && !formData.tenantId && tenants && tenants.length > 0) {
      const defaultTenant = nonSystemTenants[0] || tenants[0];
      if (defaultTenant) {
        setFormData(prev => ({ ...prev, tenantId: defaultTenant.id }));
      }
    }
  }, [tenants, userType, nonSystemTenants]);

  useEffect(() => {
    if (userType === 'regular') {
      setFormData(prev => ({ ...prev, businessLineId: '', branchId: '' }));
    }
  }, [formData.tenantId, userType]);

  useEffect(() => {
    if (userType === 'regular') {
      setFormData(prev => ({ ...prev, branchId: '' }));
    }
  }, [formData.businessLineId, userType]);

  const tenantOptions = useMemo(() => {
    const list = userType === 'tenant_admin' ? nonSystemTenants : (tenants || []);
    return list.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [tenants, nonSystemTenants, userType]);

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

    if (userType === 'tenant_admin' && !formData.tenantId) {
      setError('Please select a tenant');
      return false;
    }

    if (userType === 'regular' && !formData.branchId) {
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

    setIsSubmitting(true);

    try {
      if (userType === 'system') {
        await apiClient.post('/api/v1/hierarchy/system-users', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          roleCode: formData.roleCode,
        });
      } else if (userType === 'tenant_admin') {
        await apiClient.post('/api/v1/hierarchy/tenant-admins', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          tenantId: formData.tenantId,
        });
      } else {
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
      }
      navigate(getPath('users'));
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const backPath = getPath('users');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={backPath}>
          <Button variant="ghost" className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${typeInfo.color}`}>
            <TypeIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {typeInfo.title}
            </h1>
            <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {typeInfo.description}
            </p>
          </div>
        </div>
      </div>

      {userType !== 'regular' && (
        <div className={`p-4 rounded-lg border ${typeInfo.borderColor} ${typeInfo.color.replace('text-', 'bg-').replace('-700', '-50')}`}>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 mt-0.5" />
            <div>
              <h4 className="font-medium">
                {userType === 'system' ? 'System User Information' : 'Tenant Admin Information'}
              </h4>
              <p className="text-sm mt-1 opacity-90">
                {userType === 'system' 
                  ? 'System users have platform-wide access and are not assigned to any tenant or branch. They can manage all tenants and system configurations.'
                  : 'Tenant admins have full access to their assigned tenant. They are automatically granted the TENANT_ADMIN role with all permissions within their organization.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

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

            {userType === 'regular' && (
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
            )}
          </CardContent>
        </Card>

        {userType === 'system' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                System Role
              </CardTitle>
              <CardDescription>Select the system-level role for this user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleCode">System Role *</Label>
                <Select
                  value={formData.roleCode}
                  onChange={(e) => handleChange('roleCode', e.target.value)}
                >
                  {systemRoleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border">
                <p className="text-sm text-gray-600">
                  System users are automatically assigned to the SYSTEM tenant and have platform-wide access based on their role.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {userType === 'tenant_admin' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Tenant Assignment
              </CardTitle>
              <CardDescription>Select the tenant this admin will manage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">TENANT_ADMIN Role</span>
                  <Badge className="bg-blue-600">Auto-Assigned</Badge>
                </div>
                <p className="text-sm text-blue-600">
                  This user will be automatically assigned the TENANT_ADMIN role with full permissions within their tenant. They can manage all business lines, branches, and users within their organization.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {userType === 'regular' && (
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
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Link to={backPath}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-[#2563EB] hover:bg-[#1E40AF]"
            disabled={isSubmitting || createUser.isPending}
          >
            {(isSubmitting || createUser.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create {userType === 'system' ? 'System User' : userType === 'tenant_admin' ? 'Tenant Admin' : 'User'}
          </Button>
        </div>
      </form>
    </div>
  );
}
