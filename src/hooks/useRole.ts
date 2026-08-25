import { useState, useEffect } from 'react';

export type Role = 'admin' | 'member' | 'none';

const getInitialRole = (): Role => {
  try {
    return (localStorage.getItem('class_role') as Role) || 'none';
  } catch (e) {
    return 'none';
  }
};

export function useRole() {
  const [role, setRoleState] = useState<Role>(getInitialRole());

  useEffect(() => {
    const handleStorage = () => {
      setRoleState(getInitialRole());
    };

    window.addEventListener('role_changed', handleStorage);
    return () => window.removeEventListener('role_changed', handleStorage);
  }, []);

  const setRole = (newRole: Role) => {
    try {
      localStorage.setItem('class_role', newRole);
    } catch (e) {
      console.warn("localStorage not available");
    }
    setRoleState(newRole);
    window.dispatchEvent(new Event('role_changed'));
  };

  return { role, setRole, isAdmin: role === 'admin', isMember: role === 'member' };
}
