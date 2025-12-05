import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Users, ArrowRight } from 'lucide-react';
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
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-200',
    hoverBg: 'hover:bg-purple-50',
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
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-200',
    hoverBg: 'hover:bg-blue-50',
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
                className={`
                  relative p-4 rounded-lg border-2 text-left transition-all duration-200
                  ${isSelected 
                    ? `${type.borderColor} bg-gradient-to-r ${type.color} text-white shadow-lg` 
                    : `border-gray-200 ${type.hoverBg}`
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    p-3 rounded-lg
                    ${isSelected ? 'bg-white/20' : `bg-gradient-to-r ${type.color} text-white`}
                  `}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {type.title}
                    </h3>
                    <p className={`text-sm mb-3 ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                      {type.description}
                    </p>
                    <ul className="space-y-1">
                      {type.details.map((detail, i) => (
                        <li 
                          key={i} 
                          className={`text-xs flex items-center gap-2 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-gray-400'}`} />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedType}
            className="bg-[#2563EB] hover:bg-[#1E40AF]"
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
