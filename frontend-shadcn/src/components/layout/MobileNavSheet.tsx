import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
  }`;

export function MobileNavSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const close = () => onOpenChange(false);

  const handleLogout = async () => {
    await logout();
    close();
    navigate('/login');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full max-w-xs p-0">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle>菜单</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-6 py-4">
          <nav className="flex flex-col gap-1">
            <NavLink to="/items" className={navLinkClass} onClick={close}>档案</NavLink>
            <NavLink to="/tool" className={navLinkClass} onClick={close}>工具</NavLink>
            <NavLink to="/speedTest" className={navLinkClass} onClick={close}>测速</NavLink>
          </nav>
          {isAuthenticated && (
            <SearchBar variant="mobile" onSubmitted={close} />
          )}
          {isAuthenticated && (
            <Button variant="outline" className="justify-start" onClick={handleLogout}>
              <LogOut className="size-4" />
              登出
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
