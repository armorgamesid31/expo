import { Shield, Sparkles } from 'lucide-react';
import { UserRole } from '../../types';
import { Button } from '../ui/button';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full p-1 shadow-lg">
      <Button
        size="sm"
        variant={currentRole === 'admin' ? 'default' : 'ghost'}
        className={`rounded-full gap-2 ${
          currentRole === 'admin' 
            ? 'bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white' 
            : ''
        }`}
        onClick={() => onRoleChange('admin')}
      >
        <Shield className="w-4 h-4" />
        <span className="hidden sm:inline">Admin</span>
      </Button>
      <Button
        size="sm"
        variant={currentRole === 'specialist' ? 'default' : 'ghost'}
        className={`rounded-full gap-2 ${
          currentRole === 'specialist' 
            ? 'bg-[var(--deep-indigo)] hover:bg-[var(--deep-indigo-light)] text-white' 
            : ''
        }`}
        onClick={() => onRoleChange('specialist')}
      >
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline">Personel</span>
      </Button>
    </div>
  );
}