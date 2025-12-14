import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const UserProfile = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <Button
      variant="ghost"
      className="relative h-10 w-24 rounded bg-brand-100 hover:bg-brand-200 transition-colors flex items-center justify-center gap-2"
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
};

export default UserProfile;
