import { AppSidebar } from "@/components/layout/AppSidebar"
import { BackToTopButton } from "@/components/layout/BackToTopButton"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useSidebarDefaultOpen } from "@/hooks/use-mobile"
import { PageTitleProvider } from "@/hooks/use-page-title-context"
import { useRef } from "react"
import { Outlet } from "react-router-dom"

interface MasterLayoutProps {
  children?: React.ReactNode
}

export function MasterLayout({ children }: MasterLayoutProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const defaultSidebarOpen = useSidebarDefaultOpen()

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <PageTitleProvider>
        <AppSidebar />
        <SidebarInset ref={scrollContainerRef} className="flex h-svh flex-col overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable] bg-background transition-colors duration-300 min-w-0">
          <SiteHeader />
          <div className="flex flex-col min-h-[calc(100svh-3.5rem)] px-6 pt-6 md:px-8 md:pt-8 max-w-7xl w-full mx-auto min-w-0">
            <div className="flex flex-1 flex-col space-y-8 animate-fade-in-up">
              {children ?? <Outlet />}
            </div>
            <footer className="mt-8 shrink-0 border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
              Copyright © 2026 By wmxy2005
            </footer>
          </div>
          <BackToTopButton scrollContainerRef={scrollContainerRef} />
        </SidebarInset>
      </PageTitleProvider>
    </SidebarProvider>
  )
}
