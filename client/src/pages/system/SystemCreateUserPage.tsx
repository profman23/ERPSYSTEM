import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Shield, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTenants } from '@/hooks/useHierarchy';
import { apiClient } from '@/lib/api';

type UserType = 'system' | 'tenant_admin';

const systemRoleOptions = [
  { value: 'SYSTEM_ADMIN', label: 'System Administrator - Full platform access' },
];

function getUserTypeInfo(type: UserType) {
  if (type === 'system') {
    return {
      icon: Shield,
      title: 'Create System User',
      description: 'Platform-level user with system-wide access',
      color: 'bg-purple-500/20 text-purple-400',
      borderColor: 'border-purple-500/30',
    };
  }
  return {
    icon: Building2,
    title: 'Create Tenant Admin',
    description: 'Organization administrator with full tenant access',
    color: 'bg-blue-500/20 text-blue-400',
    borderColor: 'border-blue-500/30',
  };
}

export default function SystemCreateUserPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const userTypeParam = searchParams.get('type') as UserType | null;
  const userType: UserType = userTypeParam === 'tenant_admin' ? 'tenant_admin' : 'system';
  
  const typeInfo = getUserTypeInfo(userType);
  const TypeIcon = typeInfo.icon;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    roleCode: 'SYSTEM_ADMIN',
    tenantId: '',
  });
  
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { data: tenants } = useTenants();

  const nonSystemTenants = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => t.code !== 'SYSTEM');
  }, [tenants]);

  const tenantOptions = useMemo(() => {
    return nonSystemTenants.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [nonSystemTenants]);

  useEffect(() => {
    if (userType === 'tenant_admin' && !formData.tenantId && nonSystemTenants.length > 0) {
      setFormData(prev => ({ ...prev, tenantId: nonSystemTenants[0].id }));
    }
  }, [nonSystemTenants, userType]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'password' || field === 'confirmPassword') {
      setPasswordError(null);
    }
    setError(null);
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
      } else {
        await apiClient.post('/api/v1/hierarchy/tenant-admins', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          tenantId: formData.tenantId,
        });
      }
      setSuccess(true);
      setTimeout(() => navigate('/system/users'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/system/users">
          <Button variant="ghost" className="p-2 text-gray-400 hover:text-white hover:bg-[#334155]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${typeInfo.color}`}>
            <TypeIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {typeInfo.title}
            </h1>
            <p className="mt-1 text-gray-400">
              {typeInfo.description}
            </p>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${typeInfo.borderColor} bg-[#1E293B]`}>
        <div className="flex items-start gap-3">
          <TypeIcon className="w-5 h-5 mt-0.5 text-gray-400" />
          <div>
            <h4 className="font-medium text-white">
              {userType === 'system' ? 'System User Information' : 'Tenant Admin Information'}
            </h4>
            <p className="text-sm mt-1 text-gray-400">
              {userType === 'system' 
                ? 'System users have platform-wide access and are not assigned to any tenant or branch. They can manage all tenants and system configurations.'
                : 'Tenant admins have full access to their assigned tenant. They are automatically granted the TENANT_ADMIN role with all permissions within their organization.'
              }
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2 text-green-400">
          <Shield className="w-5 h-5" />
          <span>User created successfully! Redirecting...</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white">User Information</CardTitle>
            <CardDescription className="text-gray-400">Enter the basic details for the new user</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                  className="bg-[#0F172A] border-[#334155] text-white placeholder:text-gray-500 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  className="bg-[#0F172A] border-[#334155] text-white placeholder:text-gray-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="user@example.com"
                  className="bg-[#0F172A] border-[#334155] text-white placeholder:text-gray-500 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="bg-[#0F172A] border-[#334155] text-white placeholder:text-gray-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="bg-[#0F172A] border-[#334155] text-white placeholder:text-gray-500 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Repeat password"
                  className={`bg-[#0F172A] border-[#334155] text-white placeholder:text-gray-500 focus:border-purple-500 ${passwordError ? 'border-red-500' : ''}`}
                />
                {passwordError && (
                  <p className="text-sm text-red-400">{passwordError}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {userType === 'system' && (
          <Card className="mt-6 bg-[#1E293B] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                System Role
              </CardTitle>
              <CardDescription className="text-gray-400">Select the system-level role for this user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleCode" className="text-gray-300">System Role *</Label>
                <Select
                  value={formData.roleCode}
                  onChange={(e) => handleChange('roleCode', e.target.value)}
                  className="bg-[#0F172A] border-[#334155] text-white"
                >
                  {systemRoleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-[#0F172A] border border-[#334155]">
                <p className="text-sm text-gray-400">
                  System users are automatically assigned to the SYSTEM tenant and have platform-wide access based on their role.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {userType === 'tenant_admin' && (
          <Card className="mt-6 bg-[#1E293B] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Tenant Assignment
              </CardTitle>
              <CardDescription className="text-gray-400">Select the tenant this admin will manage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Tenant *</Label>
                <Select
                  value={formData.tenantId}
                  onChange={(e) => handleChange('tenantId', e.target.value)}
                  className="bg-[#0F172A] border-[#334155] text-white"
                >
                  <option value="">Select Tenant</option>
                  {tenantOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">TENANT_ADMIN Role</span>
                  <Badge className="bg-blue-600 text-white text-xs">Auto-Assigned</Badge>
                </div>
                <p className="text-sm text-blue-300/80">
                  This user will be automatically assigned the TENANT_ADMIN role with full permissions within their tenant.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Link to="/system/users">
            <Button type="button" variant="outline" className="border-[#334155] text-gray-300 hover:bg-[#334155] hover:text-white">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isSubmitting || success}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create {userType === 'system' ? 'System User' : 'Tenant Admin'}
          </Button>
        </div>
      </form>
    </div>
  );
}
