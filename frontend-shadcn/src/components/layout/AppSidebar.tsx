import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/use-auth"
import { Archive, ChevronUp, Gauge, LogOut, User2, Wrench } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const navigation = {
  main: [
    { name: "档案", href: "/items", icon: Archive },
    { name: "角色", href: "/items/role", icon: User2 },
  ],
  tools: [
    { name: "工具", href: "/tool", icon: Wrench },
    { name: "测速", href: "/speedTest", icon: Gauge },
  ],
}

export function AppSidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-sidebar/50 backdrop-blur-md">
      <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-4">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:scale-105">
          <img src="/logo.svg" alt="Logo" className="size-5 invert dark:invert-0" />
        </div>
        <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
          <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">LSDB Admin</span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">v0.0.1</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator className="opacity-40" />
      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">主导航</SidebarGroupLabel>
          <SidebarGroupContent className="mt-1.5">
            <SidebarMenu>
              {navigation.main.map((item) => {
                const isActive = item.href === "/items"
                  ? (location.pathname === "/items" || (location.pathname.startsWith("/items/") && location.pathname !== "/items/role"))
                  : location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className="relative transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    >
                      <Link to={item.href} className="flex items-center gap-3 py-2">
                        <item.icon className={`size-4 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400'}`} />
                        <span className={`font-medium ${isActive ? 'text-zinc-900 dark:text-zinc-50 font-semibold' : 'text-zinc-600 dark:text-zinc-300'}`}>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-3 text-[11px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">工具与系统</SidebarGroupLabel>
          <SidebarGroupContent className="mt-1.5">
            <SidebarMenu>
              {navigation.tools.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className="relative transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    >
                      <Link to={item.href} className="flex items-center gap-3 py-2">
                        <item.icon className={`size-4 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400'}`} />
                        <span className={`font-medium ${isActive ? 'text-zinc-900 dark:text-zinc-50 font-semibold' : 'text-zinc-600 dark:text-zinc-300'}`}>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full justify-start gap-3 rounded-lg p-2 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 data-[state=open]:bg-zinc-100 dark:data-[state=open]:bg-zinc-800/60"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-border/40 shadow-sm">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-medium text-xs">
                      {user?.username?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{user?.username}</span>
                    <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">已认证用户</span>
                  </div>
                  <ChevronUp className="ml-auto size-3.5 text-zinc-400 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl p-1.5 shadow-md border border-border/40"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2 cursor-pointer">
                  <LogOut className="mr-2.5 size-4" />
                  <span className="font-medium">登出系统</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
