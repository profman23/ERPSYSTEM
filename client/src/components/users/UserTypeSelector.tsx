import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Users, ArrowRight, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useScopePath } from '@/hooks/useScopePath';

interface UserTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UserType = 'system' | 'tenant_admin' | null;

const userTypes = [
  {
    id: 'system' as const,
    icon: Shield,
    title: 'System User',
    description: 'Platform-level user with system-wide access. No tenant or branch assignment required.',
    details: [
      'Full platform access',
      'Can manage all tenants',
      'No branch restriction',
    ],
    accentVar: '--sys-accent',
    bgVar: '--sys-surface',
  },
  {
    id: 'tenant_admin' as const,
    icon: Building2,
    title: 'Tenant Admin',
    description: 'Organization administrator with full access to their tenant. Assigned to a specific tenant.',
    details: [
      'Full tenant access',
      'Can manage all branches',
      'Auto-granted permissions',
    ],
    accentVar: '--tenant-accent',
    bgVar: '--tenant-surface',
  },
];

export function UserTypeSelector({ open, onOpenChange }: UserTypeSelectorProps) {
  const navigate = useNavigate();
  const { getPath } = useScopePath();
  const [selectedType, setSelectedType] = useState<UserType>(null);

  const handleContinue = () => {
    if (!selectedType) return;
    onOpenChange(false);
    navigate(getPath(`users/create?type=${selectedType}`));
  };

  const handleCancel = () => {
    setSelectedType(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select User Type
          </DialogTitle>
          <DialogDescription>
            Choose the type of user you want to create. Each type has different access levels and requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {userTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className="relative p-4 rounded-lg border-2 text-left transition-all duration-200"
                style={{
                  borderColor: isSelected ? `var(${type.accentVar})` : 'var(--color-border)',
                  backgroundColor: isSelected ? `var(${type.accentVar})` : 'var(--color-surface)',
                  color: isSelected ? 'white' : 'var(--color-text)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `var(${type.accentVar})`,
                      color: 'white',
                    }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 
                      className="font-semibold text-lg mb-1"
                      style={{ color: isSelected ? 'white' : 'var(--color-text)' }}
                    >
                      {type.title}
                    </h3>
                    <p 
                      className="text-sm mb-3"
                      style={{ color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)' }}
                    >
                      {type.description}
                    </p>
                    <ul className="space-y-1">
                      {type.details.map((detail, i) => (
                        <li 
                          key={i} 
                          className="text-xs flex items-center gap-2"
                          style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}
                        >
                          <span 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)' }}
                          />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'white' }}
                      >
                        <Check 
                          className="w-4 h-4"
                          style={{ color: 'var(--color-success)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div 
          className="flex justify-end gap-3 pt-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedType}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UserTypeSelector;
