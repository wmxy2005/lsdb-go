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

import { Archive, ChevronUp, Gauge, KeyRound, LogOut, Wrench } from "lucide-react"

import { Link, useLocation, useNavigate } from "react-router-dom"

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuSeparator,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { Logo } from "@/components/Logo"

import { useTranslation } from "react-i18next"



const navigation = {

  main: [

    { nameKey: "nav.items", href: "/items", icon: Archive },

  ],

  tools: [

    { nameKey: "nav.tools", href: "/tool", icon: Wrench },

    { nameKey: "nav.speedTest", href: "/speedTest", icon: Gauge },

  ],

}





export function AppSidebar() {

  const { t } = useTranslation()

  const { user, logout, isAuthenticated } = useAuth()

  const location = useLocation()

  const navigate = useNavigate()



  const handleLogout = async () => {

    await logout()

  }



  return (

    <Sidebar collapsible="icon" className="border-r border-border/40 bg-sidebar/50 backdrop-blur-md">

      <SidebarHeader className="flex flex-row items-center px-4 py-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">

        <Link to="/" className="flex items-center group-data-[collapsible=icon]:justify-center" aria-label="LSDB">

          <Logo className="group-data-[collapsible=icon]:hidden" />

          <img
            src="/favicon.svg"
            alt=""
            aria-hidden
            className="hidden size-8 shrink-0 group-data-[collapsible=icon]:block"
          />

        </Link>

      </SidebarHeader>

      <SidebarSeparator className="opacity-40" />

      <SidebarContent className="px-2 py-2 group-data-[collapsible=icon]:px-1">

        <SidebarGroup className="group-data-[collapsible=icon]:p-0">

          <SidebarGroupLabel className="px-3 text-[11px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase group-data-[collapsible=icon]:hidden">{t("sidebar.mainNav")}</SidebarGroupLabel>

          <SidebarGroupContent className="mt-1.5">

            <SidebarMenu className="group-data-[collapsible=icon]:items-center">

              {navigation.main.map((item) => {

                const label = t(item.nameKey)

                const isActive = item.href === "/items"

                  ? location.pathname === "/items" || location.pathname.startsWith("/items/")

                  : location.pathname === item.href;

                return (

                  <SidebarMenuItem key={item.nameKey}>

                    <SidebarMenuButton

                      asChild

                      isActive={isActive}

                      tooltip={label}

                      className="relative transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&_span]:hidden"

                    >

                      <Link to={item.href} className="flex items-center gap-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:py-0">

                        <item.icon className={`size-4 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400'}`} />

                        <span className={`font-medium ${isActive ? 'text-zinc-900 dark:text-zinc-50 font-semibold' : 'text-zinc-600 dark:text-zinc-300'}`}>{label}</span>

                      </Link>

                    </SidebarMenuButton>

                  </SidebarMenuItem>

                )

              })}

            </SidebarMenu>

          </SidebarGroupContent>

        </SidebarGroup>

        <SidebarGroup className="mt-4 group-data-[collapsible=icon]:p-0">

          <SidebarGroupLabel className="px-3 text-[11px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase group-data-[collapsible=icon]:hidden">{t("sidebar.toolsAndSystem")}</SidebarGroupLabel>

          <SidebarGroupContent className="mt-1.5">

            <SidebarMenu className="group-data-[collapsible=icon]:items-center">

              {navigation.tools.map((item) => {

                const label = t(item.nameKey)

                const isActive = location.pathname === item.href;

                return (

                  <SidebarMenuItem key={item.nameKey}>

                    <SidebarMenuButton

                      asChild

                      isActive={isActive}

                      tooltip={label}

                      className="relative transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&_span]:hidden"

                    >

                      <Link to={item.href} className="flex items-center gap-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:py-0">

                        <item.icon className={`size-4 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400'}`} />

                        <span className={`font-medium ${isActive ? 'text-zinc-900 dark:text-zinc-50 font-semibold' : 'text-zinc-600 dark:text-zinc-300'}`}>{label}</span>

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

            {isAuthenticated ? (

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

                      <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{t("sidebar.authenticatedUser")}</span>

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

                  <DropdownMenuItem onClick={() => navigate("/change-password")} className="rounded-lg py-2 cursor-pointer">

                    <KeyRound className="mr-2.5 size-4" />

                    <span className="font-medium">{t("nav.changePassword")}</span>

                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2 cursor-pointer">

                    <LogOut className="mr-2.5 size-4" />

                    <span className="font-medium">{t("nav.logoutSystem")}</span>

                  </DropdownMenuItem>

                </DropdownMenuContent>

              </DropdownMenu>

            ) : (

              <SidebarMenuButton

                size="lg"

                className="w-full justify-start gap-3 rounded-lg p-2"

              >

                <Avatar className="h-8 w-8 rounded-lg border border-border/40 shadow-sm">

                  <AvatarFallback className="rounded-lg bg-muted text-muted-foreground font-medium text-xs">

                    ?

                  </AvatarFallback>

                </Avatar>

                <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">

                  <span className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{t("sidebar.notLoggedIn")}</span>

                  <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{t("auth.pleaseLogin")}</span>

                </div>

              </SidebarMenuButton>

            )}

          </SidebarMenuItem>

        </SidebarMenu>

      </SidebarFooter>

    </Sidebar>

  )

}


