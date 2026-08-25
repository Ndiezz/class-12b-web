import { useState, useEffect } from 'react';

export type Role = 'admin' | 'member' | 'none';

export function useRole() {
  const [role, setRoleState] = useState<Role>(
    (localStorage.getItem('class_role') as Role) || 'none'
  );

  useEffect(() => {
    const handleStorage = () => {
      setRoleState((localStorage.getItem('class_role') as Role) || 'none');
    };
    window.addEventListener('role_changed', handleStorage);
    return () => window.removeEventListener('role_changed', handleStorage);
  }, []);

  const setRole = (newRole: Role) => {
    localStorage.setItem('class_role', newRole);
    setRoleState(newRole);
    window.dispatchEvent(new Event('role_changed'));
  };

  return { role, setRole, isAdmin: role === 'admin', isMember: role === 'member' };
}
