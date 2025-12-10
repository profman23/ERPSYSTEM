import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building2, Users, MapPin, GitBranch, 
  Plus, ChevronRight, Eye, Edit 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useHierarchy';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';

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
    return <LoadingState size="lg" message="Loading tenant..." fullPage />;
  }

  if (error || !tenant) {
    return (
      <EmptyState
        icon={Building2}
        title="Tenant Not Found"
        description="The tenant you're looking for doesn't exist or you don't have access."
        action={{
          label: 'Back to Tenants',
          onClick: () => navigate('/tenants'),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/tenants"
          className="inline-flex items-center gap-2 text-sm mb-4 transition-colors hover:opacity-70"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tenants
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{ 
              backgroundColor: tenant.primaryColor || 'var(--color-accent)',
              color: 'var(--color-text-on-accent)'
            }}
          >
            {tenant.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {tenant.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <code 
                className="text-sm px-2 py-1 rounded"
                style={{ backgroundColor: 'var(--color-surface-hover)' }}
              >
                {tenant.code}
              </code>
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
            <Button>
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
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--badge-info-bg)' }}
              >
                <GitBranch className="w-6 h-6" style={{ color: 'var(--color-info)' }} />
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
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--badge-success-bg)' }}
              >
                <MapPin className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
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
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-accent-light)' }}
              >
                <Users className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
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
            <EmptyState
              icon={GitBranch}
              title="No Business Lines Yet"
              description="Start by creating your first business line"
              action={{
                label: 'Add Business Line',
                onClick: () => navigate(`/business-lines/create?tenantId=${tenantId}`),
                icon: Plus,
              }}
            />
          ) : (
            <div className="space-y-4">
              {tenant.businessLines.map((bl) => (
                <div 
                  key={bl.id} 
                  className="border rounded-lg overflow-hidden"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer transition-colors"
                    style={{ backgroundColor: 'var(--color-surface-hover)' }}
                    onClick={() => setExpandedBL(expandedBL === bl.id ? null : bl.id)}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight
                        className={`w-5 h-5 transition-transform ${expandedBL === bl.id ? 'rotate-90' : ''}`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{bl.name}</p>
                          <code 
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--color-surface)' }}
                          >
                            {bl.code}
                          </code>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{bl.businessLineType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
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
                    <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      {bl.branches.length === 0 ? (
                        <p className="text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                          No branches in this business line
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {bl.branches.map((branch) => (
                            <div
                              key={branch.id}
                              className="flex items-center justify-between p-3 border rounded-lg transition-colors"
                              style={{ 
                                backgroundColor: 'var(--color-surface)',
                                borderColor: 'var(--color-border)'
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{branch.name}</p>
                                    <code 
                                      className="text-xs px-1.5 py-0.5 rounded"
                                      style={{ backgroundColor: 'var(--color-surface-hover)' }}
                                    >
                                      {branch.code}
                                    </code>
                                  </div>
                                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                    {[branch.city, branch.state, branch.country].filter(Boolean).join(', ') || 'No location'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{branch.userCount}</span>
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
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
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
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Email</p>
                  <p className="mt-1">{tenant.contactEmail}</p>
                </div>
              )}
              {tenant.contactPhone && (
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Phone</p>
                  <p className="mt-1">{tenant.contactPhone}</p>
                </div>
              )}
              {tenant.address && (
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Address</p>
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
