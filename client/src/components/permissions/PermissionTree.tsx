import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PermissionCheckbox } from './PermissionCheckbox';
import { Badge } from '@/components/ui/badge';
import type { PermissionMatrixModule, PermissionMatrixScreen, DPFAction } from '@types/dpf';

interface PermissionTreeProps {
  modules: PermissionMatrixModule[];
  selectedPermissions: Set<string>;
  onPermissionToggle: (permissionCode: string, checked: boolean) => void;
  onModuleToggle: (moduleCode: string, checked: boolean) => void;
  onScreenToggle: (moduleCode: string, screenCode: string, checked: boolean) => void;
}

export function PermissionTree({
  modules,
  selectedPermissions,
  onPermissionToggle,
  onModuleToggle,
  onScreenToggle,
}: PermissionTreeProps) {
  const getModuleState = (module: PermissionMatrixModule) => {
    const allActions = module.screens.flatMap((s: PermissionMatrixScreen) => s.actions);
    const selectedCount = allActions.filter((a: DPFAction) => 
      selectedPermissions.has(a.actionCode)
    ).length;
    
    if (selectedCount === 0) return { checked: false, indeterminate: false };
    if (selectedCount === allActions.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const getScreenState = (screen: PermissionMatrixScreen) => {
    const selectedCount = screen.actions.filter((a: DPFAction) => 
      selectedPermissions.has(a.actionCode)
    ).length;
    
    if (selectedCount === 0) return { checked: false, indeterminate: false };
    if (selectedCount === screen.actions.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const moduleStats = useMemo(() => {
    return modules.map(module => {
      const totalActions = module.screens.flatMap((s: PermissionMatrixScreen) => s.actions).length;
      const selectedActions = module.screens
        .flatMap((s: PermissionMatrixScreen) => s.actions)
        .filter((a: DPFAction) => selectedPermissions.has(a.actionCode)).length;
      
      return {
        moduleCode: module.module.moduleCode,
        total: totalActions,
        selected: selectedActions,
      };
    });
  }, [modules, selectedPermissions]);

  return (
    <div className="space-y-2">
      <Accordion
        type="multiple"
        defaultValue={[]}
        className="w-full"
      >
        {modules.map((module) => {
          const moduleState = getModuleState(module);
          const stats = moduleStats.find(s => s.moduleCode === module.module.moduleCode);

          return (
            <AccordionItem
              key={module.module.moduleCode}
              value={module.module.moduleCode}
              className="border rounded-lg px-4 mb-2"
            >
              <AccordionTrigger className="hover:no-underline" value={module.module.moduleCode}>
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <PermissionCheckbox
                      id={`module-${module.module.moduleCode}`}
                      label={module.module.moduleName}
                      labelAr={module.module.moduleNameAr}
                      checked={moduleState.checked}
                      indeterminate={moduleState.indeterminate}
                      onCheckedChange={(checked) => onModuleToggle(module.module.moduleCode, checked as boolean)}
                      level="module"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">
                      {stats?.selected || 0} / {stats?.total || 0}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent value={module.module.moduleCode}>
                <div className="pl-6 pt-2 space-y-3">
                  <Accordion
                    type="multiple"
                    defaultValue={[]}
                  >
                    {module.screens.map((screen: PermissionMatrixScreen) => {
                      const screenState = getScreenState(screen);
                      const screenKey = `${module.module.moduleCode}-${screen.screen.screenCode}`;

                      return (
                        <AccordionItem
                          key={screenKey}
                          value={screenKey}
                          className="border-l-2 pl-4 mb-2"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <AccordionTrigger className="hover:no-underline py-2" value={screenKey}>
                            <div className="flex items-center justify-between w-full pr-4">
                              <PermissionCheckbox
                                id={`screen-${screenKey}`}
                                label={screen.screen.screenName}
                                labelAr={screen.screen.screenNameAr}
                                checked={screenState.checked}
                                indeterminate={screenState.indeterminate}
                                onCheckedChange={(checked) =>
                                  onScreenToggle(module.module.moduleCode, screen.screen.screenCode, checked as boolean)
                                }
                                level="screen"
                              />
                              <Badge className="text-xs">
                                {screen.actions.filter((a: DPFAction) => selectedPermissions.has(a.actionCode)).length} / {screen.actions.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent value={screenKey}>
                            <div className="pl-6 pt-2 space-y-2">
                              {screen.actions.map((action: DPFAction) => (
                                <PermissionCheckbox
                                  key={action.actionCode}
                                  id={`action-${action.actionCode}`}
                                  label={action.actionName}
                                  labelAr={action.actionNameAr}
                                  checked={selectedPermissions.has(action.actionCode)}
                                  onCheckedChange={(checked) =>
                                    onPermissionToggle(action.actionCode, checked as boolean)
                                  }
                                  level="action"
                                  actionType={action.actionType}
                                />
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
