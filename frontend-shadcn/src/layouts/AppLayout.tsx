import { MobileNavSheet } from '@/components/layout/MobileNavSheet';
import { SearchBar } from '@/components/SearchBar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, Menu, User } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`;

export function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto flex h-14 min-w-0 max-w-screen-2xl items-center gap-2 px-4 md:gap-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="打开菜单"
          >
            <Menu className="size-5" />
          </Button>
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src="/logo.svg" alt="LSDB" className="h-8 w-8" />
            <span className="hidden font-semibold tracking-tight sm:inline">LSDB</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/items" className={navLinkClass}>档案</NavLink>
            <NavLink to="/tool" className={navLinkClass}>工具</NavLink>
            <NavLink to="/speedTest" className={navLinkClass}>测速</NavLink>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {isAuthenticated && <SearchBar variant="desktop" />}
            <ThemeToggle />
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="size-8">
                      <AvatarFallback>{user?.username?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <User className="size-4" />
                    {user?.username}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="size-4" />
                    登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm"><Link to="/login">登录</Link></Button>
            )}
          </div>
        </div>
      </header>
      <MobileNavSheet open={navOpen} onOpenChange={setNavOpen} />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 md:px-6">
        <Outlet />
      </main>
      <footer className="text-muted-foreground border-t py-4 text-center text-xs">
        Copyright © 2026 By wmxy2005
      </footer>
    </div>
  );
}
