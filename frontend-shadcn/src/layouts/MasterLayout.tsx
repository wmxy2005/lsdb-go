import { AppSidebar } from "@/components/layout/AppSidebar"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"

interface MasterLayoutProps {
  children?: React.ReactNode
}

export function MasterLayout({ children }: MasterLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen bg-background transition-colors duration-300 min-w-0">
        <SiteHeader />
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 animate-fade-in-up min-w-0">
          {children ?? <Outlet />}
        </div>
        <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground mt-auto">
          Copyright © 2026 By wmxy2005
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
