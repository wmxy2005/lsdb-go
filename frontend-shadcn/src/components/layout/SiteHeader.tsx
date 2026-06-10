import { LanguageToggle } from "@/components/common/LanguageToggle"

import { ThemeToggle } from "@/components/common/ThemeToggle"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { Button } from "@/components/ui/button"

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu"

import { Separator } from "@/components/ui/separator"

import { SidebarTrigger } from "@/components/ui/sidebar"

import { useAuth } from "@/hooks/use-auth"

import { usePageBreadcrumbLabel } from "@/hooks/use-page-title-context"

import { Logo } from "@/components/Logo"

import { ChevronDown, LogOut, Search } from "lucide-react"

import { useEffect, useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { Link, useLocation } from "react-router-dom"

import { CommandMenu } from "./CommandMenu"



export function SiteHeader() {

  const { t } = useTranslation()

  const { isAuthenticated, user, logout } = useAuth()

  const location = useLocation()

  const dynamicBreadcrumbLabel = usePageBreadcrumbLabel()

  const [commandMenuOpen, setCommandMenuOpen] = useState(false)



  const topNavigation = useMemo(

    () => [

      { name: t("nav.items"), href: "/items" },

      { name: t("nav.tools"), href: "/tool" },

      { name: t("nav.speedTest"), href: "/speedTest" },

    ],

    [t],

  )



  const handleLogout = async () => {

    await logout()

  }



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



  const breadcrumbs = useMemo(() => {

    const paths = location.pathname.split("/").filter(Boolean)

    const crumbs = [{ name: t("breadcrumb.console"), href: "/" }]



    if (paths.length === 0) {

      crumbs.push({ name: t("breadcrumb.overview"), href: "/" })

    } else if (paths[0] === "items") {

      crumbs.push({ name: t("breadcrumb.itemsList"), href: "/items" })

      if (paths[1] === "role") {

        crumbs.push({ name: t("breadcrumb.roleManagement"), href: "/items/role" })

      } else if (paths[1]) {

        crumbs.push({ name: t("breadcrumb.itemDetail"), href: `/items/${paths[1]}` })

      }

    } else if (paths[0] === "tool") {

      crumbs.push({ name: t("breadcrumb.toolbox"), href: "/tool" })

    } else if (paths[0] === "speedTest") {

      crumbs.push({ name: t("breadcrumb.speedTest"), href: "/speedTest" })

    }

    if (dynamicBreadcrumbLabel && paths[0] === "items" && crumbs.length > 0) {
      const last = crumbs[crumbs.length - 1]
      crumbs[crumbs.length - 1] = { ...last, name: dynamicBreadcrumbLabel }
    }

    return crumbs

  }, [location.pathname, t, dynamicBreadcrumbLabel])



  return (

    <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-4 border-b border-border/40 bg-background/80 px-4 backdrop-blur-md md:px-6 transition-colors duration-300">

      <SidebarTrigger className="-ml-1 h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 lg:hidden" />

      <Separator orientation="vertical" className="mr-2 h-4 opacity-40 lg:hidden" />



      <Link to="/" className="hidden lg:flex items-center mr-4 shrink-0" aria-label="LSDB">

        <Logo />

      </Link>



      <div className="flex flex-1 items-center gap-4 md:gap-8">

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium mr-6">

          {topNavigation.map((item) => {

            const isActive =

              item.href === "/items"

                ? location.pathname === "/items" || location.pathname.startsWith("/items/")

                : location.pathname === item.href

            return (

              <Link

                key={item.href}

                to={item.href}

                className={`transition-colors hover:text-foreground relative py-1 ${

                  isActive ? "text-foreground font-semibold" : "text-muted-foreground"

                }`}

              >

                {item.name}

                {isActive && (

                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />

                )}

              </Link>

            )

          })}

        </nav>



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



        <div className="flex flex-1 items-center justify-end gap-2 md:justify-start">

          {isAuthenticated && (

            <div className="relative w-full max-w-sm">

              <Button

                variant="outline"

                onClick={() => setCommandMenuOpen(true)}

                className="relative h-9 w-full justify-start rounded-lg bg-zinc-50/50 dark:bg-zinc-900/30 border-border/60 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 text-xs font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64 transition-colors duration-200"

              >

                <Search className="mr-2 h-3.5 w-3.5 text-zinc-400" />

                <span className="hidden lg:inline-flex">{t("search.placeholderDesktop")}</span>

                <span className="inline-flex lg:hidden">{t("search.placeholderMobile")}</span>

                <kbd className="pointer-events-none absolute right-[0.4rem] top-[0.4rem] hidden h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-zinc-100 dark:bg-zinc-800 px-1.5 font-mono text-[9px] font-medium opacity-100 sm:flex text-zinc-400">

                  <span>⌘</span>K

                </kbd>

              </Button>

            </div>

          )}

        </div>

      </div>



      <div className="flex items-center gap-1.5">

        <LanguageToggle />

        <ThemeToggle />



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

                <DropdownMenuItem

                  onClick={handleLogout}

                  className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2 cursor-pointer"

                >

                  <LogOut className="mr-2.5 size-4" />

                  <span className="font-medium">{t("nav.logoutSystem")}</span>

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


