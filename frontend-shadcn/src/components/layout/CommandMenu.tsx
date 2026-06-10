import { queryItemList } from "@/api/items"
import type { ItemInfo } from "@/api/types"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { CONFIG } from "@/constants/config"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "@/providers/ThemeProvider"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Archive, ArrowRight, FileText, Gauge, Loader2, LogOut, Moon, Search, Sun, Wrench } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CommandCategory = "navigation" | "systemActions"

interface CommandItem {
  id: string
  name: string
  category: CommandCategory
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  shortcut?: string
}

type SelectableRow =
  | {
      kind: "item"
      id: string
      item: ItemInfo
      action: () => void
    }
  | {
      kind: "viewAll"
      id: string
      label: string
      action: () => void
    }
  | {
      kind: "command"
      id: string
      command: CommandItem
      action: () => void
    }

function baseLabel(base?: string) {
  return CONFIG.resBaseList.find((b) => b.name === base)?.label ?? base ?? ""
}

const CATEGORIES: CommandCategory[] = ["navigation", "systemActions"]

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toggleTheme, theme } = useTheme()
  const { logout } = useAuth()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items: CommandItem[] = useMemo(() => [
    {
      id: "items",
      name: t("commandMenu.itemsList"),
      category: "navigation",
      icon: Archive,
      action: () => navigate("/items"),
      shortcut: "G I",
    },
    {
      id: "tool",
      name: t("commandMenu.toolbox"),
      category: "navigation",
      icon: Wrench,
      action: () => navigate("/tool"),
      shortcut: "G T",
    },
    {
      id: "speedTest",
      name: t("commandMenu.speedTest"),
      category: "navigation",
      icon: Gauge,
      action: () => navigate("/speedTest"),
      shortcut: "G S",
    },
    {
      id: "theme",
      name: t("commandMenu.toggleTheme", {
        mode: theme === "light" ? t("commandMenu.theme.dark") : t("commandMenu.theme.light"),
      }),
      category: "systemActions",
      icon: theme === "light" ? Moon : Sun,
      action: () => toggleTheme(),
      shortcut: "T T",
    },
    {
      id: "logout",
      name: t("nav.logoutSystem"),
      category: "systemActions",
      icon: LogOut,
      action: async () => {
        await logout()
      },
      shortcut: "⌥ L",
    },
  ], [t, theme, navigate, toggleTheme, logout])

  const filteredItems = useMemo(() => items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      t(`commandMenu.category.${item.category}`).toLowerCase().includes(search.toLowerCase()),
  ), [items, search, t])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data: searchData, isFetching: isSearchFetching } = useQuery({
    queryKey: ["command-search", debouncedSearch],
    enabled: open && debouncedSearch.trim().length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await queryItemList({
        keyword: debouncedSearch.trim(),
        page: "1",
        pageSize: "8",
      })
      return res
    },
  })

  const itemResults = searchData?.success ? (searchData.data?.list ?? []) : []
  const itemTotal = searchData?.success ? (searchData.data?.total ?? 0) : 0
  const hasDebouncedSearch = debouncedSearch.trim().length > 0

  const navigateToAllResults = useCallback(() => {
    navigate(`/items?keyword=${encodeURIComponent(debouncedSearch.trim())}`)
    onOpenChange(false)
  }, [debouncedSearch, navigate, onOpenChange])

  const selectableRows = useMemo<SelectableRow[]>(() => {
    const rows: SelectableRow[] = []

    if (hasDebouncedSearch) {
      if (!isSearchFetching) {
        rows.push({
          kind: "viewAll",
          id: "view-all",
          label: t("commandMenu.viewAllResults", { count: itemTotal }),
          action: navigateToAllResults,
        })
      }

      for (const item of itemResults) {
        rows.push({
          kind: "item",
          id: `item-${item.id}`,
          item,
          action: () => {
            navigate(`/items/${item.id}`)
            onOpenChange(false)
          },
        })
      }
    }

    for (const command of filteredItems) {
      rows.push({
        kind: "command",
        id: command.id,
        command,
        action: () => {
          command.action()
          onOpenChange(false)
        },
      })
    }

    return rows
  }, [
    filteredItems,
    hasDebouncedSearch,
    isSearchFetching,
    itemResults,
    itemTotal,
    navigate,
    navigateToAllResults,
    onOpenChange,
    t,
  ])

  const runSelectedAction = useCallback(() => {
    const row = selectableRows[selectedIndex]
    if (row) {
      row.action()
      return
    }
    if (search.trim()) {
      navigate(`/items?keyword=${encodeURIComponent(search.trim())}`)
      onOpenChange(false)
    }
  }, [navigate, onOpenChange, search, selectableRows, selectedIndex])

  useEffect(() => {
    if (open) {
      setSearch("")
      setDebouncedSearch("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search, debouncedSearch, selectableRows.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        if (selectableRows.length === 0) return
        setSelectedIndex((prev) => (prev + 1) % selectableRows.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        if (selectableRows.length === 0) return
        setSelectedIndex((prev) => (prev - 1 + selectableRows.length) % selectableRows.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        runSelectedAction()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, runSelectedAction, selectableRows.length])

  const showArchiveSection = hasDebouncedSearch
  const showEmptyState =
    selectableRows.length === 0 &&
    !isSearchFetching &&
    (hasDebouncedSearch || filteredItems.length === 0)

  const rowButtonClass = (isSelected: boolean) =>
    cn(
      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-150 text-left",
      isSelected
        ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium"
        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border/40 shadow-2xl rounded-xl">
        <div className="flex items-center px-4 border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Search className="size-4 mr-3 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("commandMenu.placeholder")}
            className="w-full h-12 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2 space-y-3">
          {showArchiveSection && (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                {t("commandMenu.section.archiveResults")}
              </div>
              {!isSearchFetching && hasDebouncedSearch && (
                (() => {
                  const viewAllIndex = selectableRows.findIndex((r) => r.kind === "viewAll")
                  const isSelected = viewAllIndex === selectedIndex
                  return (
                    <button
                      type="button"
                      onClick={navigateToAllResults}
                      className={rowButtonClass(isSelected)}
                    >
                      <div className="flex items-center gap-3">
                        <ArrowRight className={cn("size-4", isSelected ? "text-primary" : "text-zinc-400")} />
                        <span>{t("commandMenu.viewAllResults", { count: itemTotal })}</span>
                      </div>
                    </button>
                  )
                })()
              )}
              {isSearchFetching && itemResults.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("commandMenu.searching")}</span>
                </div>
              ) : itemResults.length === 0 && !isSearchFetching ? (
                <div className="px-3 py-3 text-xs text-muted-foreground">{t("commandMenu.noArchivesFound")}</div>
              ) : (
                itemResults.map((item) => {
                  const rowIndex = selectableRows.findIndex((r) => r.kind === "item" && r.item.id === item.id)
                  const isSelected = rowIndex === selectedIndex
                  const subtitle = [baseLabel(item.base), item.category].filter(Boolean).join(" · ")

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        navigate(`/items/${item.id}`)
                        onOpenChange(false)
                      }}
                      className={rowButtonClass(isSelected)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className={cn("size-4 shrink-0", isSelected ? "text-primary" : "text-zinc-400")} />
                        <div className="min-w-0 text-left">
                          <div className="truncate">{item.title || item.name}</div>
                          {subtitle && (
                            <div className="truncate text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                              {subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}

          {filteredItems.length > 0 && (
            <>
              {CATEGORIES.map((category) => {
                const categoryItems = filteredItems.filter((item) => item.category === category)
                if (categoryItems.length === 0) return null

                return (
                  <div key={category} className="space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      {t(`commandMenu.category.${category}`)}
                    </div>
                    {categoryItems.map((item) => {
                      const rowIndex = selectableRows.findIndex((r) => r.kind === "command" && r.id === item.id)
                      const isSelected = rowIndex === selectedIndex

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            item.action()
                            onOpenChange(false)
                          }}
                          className={rowButtonClass(isSelected)}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className={cn("size-4", isSelected ? "text-primary" : "text-zinc-400")} />
                            <span>{item.name}</span>
                          </div>
                          {item.shortcut && (
                            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-border/40 bg-zinc-100 dark:bg-zinc-800 px-1.5 font-mono text-[9px] font-medium opacity-100 sm:flex text-zinc-400">
                              {item.shortcut}
                            </kbd>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}

          {showEmptyState && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {hasDebouncedSearch ? t("commandMenu.emptyWithSearch") : t("commandMenu.emptyNoSearch")}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center gap-3">
            <span>{t("commandMenu.hint.navigate")}</span>
            <span>{t("commandMenu.hint.select")}</span>
            {search.trim() && <span>{t("commandMenu.hint.viewAll")}</span>}
            <span>{t("commandMenu.hint.close")}</span>
          </div>
          <div className="font-mono">{t("commandMenu.brand")}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
