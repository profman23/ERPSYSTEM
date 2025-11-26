import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building2, Users, MapPin, GitBranch, 
  Plus, ChevronRight, Loader2, Eye, Edit 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useHierarchy';

const planColors: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  trial: 'default',
  standard: 'info',
  professional: 'success',
  enterprise: 'warning',
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'default',
  suspended: 'error',
  pending: 'warning',
};

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading, error } = useTenant(tenantId);
  const [expandedBL, setExpandedBL] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        <span className="ml-3" style={{ color: 'var(--color-text-secondary)' }}>Loading tenant...</span>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="text-center py-24">
        <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Tenant Not Found
        </h3>
        <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          The tenant you're looking for doesn't exist or you don't have access.
        </p>
        <Link to="/tenants">
          <Button variant="outline">Back to Tenants</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/tenants"
          className="inline-flex items-center gap-2 text-sm mb-4 hover:text-[#2563EB] transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tenants
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: tenant.primaryColor || '#2563EB' }}
          >
            {tenant.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {tenant.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">{tenant.code}</code>
              <Badge variant={planColors[tenant.subscriptionPlan] || 'default'}>
                {tenant.subscriptionPlan}
              </Badge>
              <Badge variant={statusColors[tenant.status] || 'default'}>
                {tenant.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/tenants/${tenantId}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Link to={`/business-lines?tenantId=${tenantId}`}>
            <Button className="bg-[#2563EB] hover:bg-[#1E40AF]">
              <Plus className="w-4 h-4 mr-2" />
              Add Business Line
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-50">
                <GitBranch className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {tenant.businessLineCount || tenant.businessLines?.length || 0}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Business Lines
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-50">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {tenant.totalBranches || 0}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Branches
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-50">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {tenant.totalUsers || 0}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Users
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Hierarchy</CardTitle>
          <CardDescription>
            View all business lines, branches, and users under this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tenant.businessLines || tenant.businessLines.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
              <GitBranch className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                No Business Lines Yet
              </h3>
              <p className="mb-4">Start by creating your first business line</p>
              <Link to={`/business-lines/create?tenantId=${tenantId}`}>
                <Button className="bg-[#2563EB] hover:bg-[#1E40AF]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Business Line
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tenant.businessLines.map((bl) => (
                <div key={bl.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedBL(expandedBL === bl.id ? null : bl.id)}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight
                        className={`w-5 h-5 transition-transform ${expandedBL === bl.id ? 'rotate-90' : ''}`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{bl.name}</p>
                          <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{bl.code}</code>
                        </div>
                        <p className="text-sm text-gray-500">{bl.businessLineType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {bl.branchCount} branches, {bl.totalUsers} users
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/business-lines/${bl.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedBL === bl.id && (
                    <div className="p-4 border-t">
                      {bl.branches.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No branches in this business line</p>
                      ) : (
                        <div className="space-y-3">
                          {bl.branches.map((branch) => (
                            <div
                              key={branch.id}
                              className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{branch.name}</p>
                                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{branch.code}</code>
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    {[branch.city, branch.state, branch.country].filter(Boolean).join(', ') || 'No location'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-500">{branch.userCount}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/branches/${branch.id}`)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t">
                        <Link to={`/branches/create?businessLineId=${bl.id}`}>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Branch to {bl.name}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {tenant.contactEmail || tenant.contactPhone || tenant.address ? (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tenant.contactEmail && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1">{tenant.contactEmail}</p>
                </div>
              )}
              {tenant.contactPhone && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1">{tenant.contactPhone}</p>
                </div>
              )}
              {tenant.address && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="mt-1">{tenant.address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
