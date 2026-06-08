import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { useAuth } from "@/hooks/use-auth"
import { Bell, Search, ChevronDown, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { CommandMenu } from "./CommandMenu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function SiteHeader() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)

  const topNavigation = [
    { name: "档案", href: "/items" },
    { name: "角色", href: "/items/role" },
    { name: "工具", href: "/tool" },
    { name: "测速", href: "/speedTest" },
  ]

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  // Register ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandMenuOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // 动态面包屑解析
  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean)
    const breadcrumbs = [{ name: "控制台", href: "/" }]

    if (paths.length === 0) {
      breadcrumbs.push({ name: "概览", href: "/" })
    } else {
      if (paths[0] === "items") {
        breadcrumbs.push({ name: "档案列表", href: "/items" })
        if (paths[1] === "role") {
          breadcrumbs.push({ name: "角色管理", href: "/items/role" })
        } else if (paths[1]) {
          breadcrumbs.push({ name: "档案详情", href: `/items/${paths[1]}` })
        }
      } else if (paths[0] === "tool") {
        breadcrumbs.push({ name: "工具箱", href: "/tool" })
      } else if (paths[0] === "speedTest") {
        breadcrumbs.push({ name: "网络测速", href: "/speedTest" })
      }
    }
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/40 bg-background/80 px-4 backdrop-blur-md md:px-6 transition-all duration-300">
      <SidebarTrigger className="-ml-1 h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 lg:hidden" />
      <Separator orientation="vertical" className="mr-2 h-4 opacity-40 lg:hidden" />
      
      {/* 宽屏下的 Logo 与标题 */}
      <Link to="/" className="hidden lg:flex items-center gap-2 mr-4 shrink-0">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:scale-105">
          <img src="/logo.svg" alt="Logo" className="size-5 invert dark:invert-0" />
        </div>
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 text-sm">LSDB Admin</span>
          <span className="text-[10px] text-muted-foreground font-medium">v0.0.1</span>
        </div>
      </Link>
      
      <div className="flex flex-1 items-center gap-4 md:gap-8">
        {/* 宽屏下的顶部导航链接 */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium mr-6">
          {topNavigation.map((item) => {
            const isActive = item.href === "/items"
              ? (location.pathname === "/items" || (location.pathname.startsWith("/items/") && location.pathname !== "/items/role"))
              : location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`transition-colors hover:text-foreground relative py-1 ${
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {item.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* 动态面包屑导航 */}
        <nav className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground md:flex lg:hidden">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-zinc-400 dark:text-zinc-600">/</span>}
              <Link
                to={crumb.href}
                className={`transition-colors hover:text-foreground ${
                  index === breadcrumbs.length - 1
                    ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {crumb.name}
              </Link>
            </div>
          ))}
        </nav>

        {/* 全局搜索框缩略状态 (Command Menu 触发器) */}
        <div className="flex flex-1 items-center justify-end gap-2 md:justify-start">
          {isAuthenticated && (
            <div className="relative w-full max-w-sm">
              <Button
                variant="outline"
                onClick={() => setCommandMenuOpen(true)}
                className="relative h-9 w-full justify-start rounded-lg bg-zinc-50/50 dark:bg-zinc-900/30 border-border/60 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 text-xs font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64 transition-all duration-200"
              >
                <Search className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                <span className="hidden lg:inline-flex">搜索资源与档案...</span>
                <span className="inline-flex lg:hidden">搜索...</span>
                <kbd className="pointer-events-none absolute right-[0.4rem] top-[0.4rem] hidden h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-zinc-100 dark:bg-zinc-800 px-1.5 font-mono text-[9px] font-medium opacity-100 sm:flex text-zinc-400">
                  <span>⌘</span>K
                </kbd>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 relative"
        >
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 ring-2 ring-background animate-pulse" />
        </Button>
        <ThemeToggle />

        {/* 用户头像下拉菜单 (仅在 lg 屏幕且已登录时显示) */}
        {isAuthenticated && (
          <div className="hidden lg:block ml-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 gap-2 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <Avatar className="h-6 w-6 rounded-md border border-border/40 shadow-sm">
                    <AvatarFallback className="rounded-md bg-primary text-primary-foreground font-medium text-[10px]">
                      {user?.username?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium max-w-[80px] truncate">{user?.username}</span>
                  <ChevronDown className="size-3 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                className="w-48 rounded-xl p-1.5 shadow-md border border-border/40"
                align="end"
                sideOffset={8}
              >
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2 cursor-pointer">
                  <LogOut className="mr-2.5 size-4" />
                  <span className="font-medium">登出系统</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <CommandMenu open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />
    </header>
  )
}
