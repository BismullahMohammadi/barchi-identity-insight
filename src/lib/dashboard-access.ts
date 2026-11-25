export const DASHBOARD_SECTIONS = [
  'dashboard','weekly','total','identity','control','services','distribution','bank',
  'arrivals','archive-scan','annual','problem-visitors','fuel-management',
  'reconciliation','center-quality','settings',
] as const;
export const DASHBOARD_ACTIONS = ['view','create','edit','delete','print','export'] as const;

type Access = { owner: boolean; permissions: Record<string,string[]> };
export function canAccess(access: Access | undefined, section: string, action = 'view'): boolean {
  if (access?.owner) return true;
  const grants = access?.permissions[section];
  return Array.isArray(grants) && grants.includes('view') && grants.includes(action);
}

export function sectionForPage(slug: string | undefined) {
  return slug === 'staff-reconciliation' ? 'reconciliation' : slug ?? 'dashboard';
}

export function availableActions(section: string): readonly string[] {
  switch (section) {
    case 'weekly': return ['view'];
    case 'dashboard':
    case 'problem-visitors': return ['view','create','edit','delete'];
    case 'settings': return ['view','edit'];
    case 'center-quality': return ['view'];
    case 'fuel-management': return ['view','create'];
    default: return ['view','print','export'];
  }
}
