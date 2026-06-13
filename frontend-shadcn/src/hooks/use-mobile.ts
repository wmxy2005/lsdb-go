import * as React from "react"

const MOBILE_BREAKPOINT = 768
const LARGE_BREAKPOINT = 1280

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// On medium-width screens the expanded sidebar crowds the content area,
// so default it to the collapsed (icon) state. Large screens stay expanded.
// Computed once at mount; the user can still toggle freely afterwards.
export function useSidebarDefaultOpen() {
  return React.useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= LARGE_BREAKPOINT
  )[0]
}
