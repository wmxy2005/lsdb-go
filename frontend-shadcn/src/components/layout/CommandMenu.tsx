import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useTheme } from "@/providers/ThemeProvider"
import { useAuth } from "@/hooks/use-auth"
import { Archive, Gauge, LogOut, Moon, Search, Sun, User2, Wrench } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandItem {
  id: string
  name: string
  category: "导航" | "系统操作"
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  shortcut?: string
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate()
  const { toggleTheme, theme } = useTheme()
  const { logout } = useAuth()
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items: CommandItem[] = [
    {
      id: "items",
      name: "档案列表",
      category: "导航",
      icon: Archive,
      action: () => navigate("/items"),
      shortcut: "G I",
    },
    {
      id: "role",
      name: "角色管理",
      category: "导航",
      icon: User2,
      action: () => navigate("/items/role"),
      shortcut: "G R",
    },
    {
      id: "tool",
      name: "工具箱",
      category: "导航",
      icon: Wrench,
      action: () => navigate("/tool"),
      shortcut: "G T",
    },
    {
      id: "speedTest",
      name: "网络测速",
      category: "导航",
      icon: Gauge,
      action: () => navigate("/speedTest"),
      shortcut: "G S",
    },
    {
      id: "theme",
      name: `切换至 ${theme === "light" ? "深色" : "浅色"} 模式`,
      category: "系统操作",
      icon: theme === "light" ? Moon : Sun,
      action: () => toggleTheme(),
      shortcut: "T T",
    },
    {
      id: "logout",
      name: "登出系统",
      category: "系统操作",
      icon: LogOut,
      action: async () => {
        await logout()
        navigate("/login")
      },
      shortcut: "⌥ L",
    },
  ]

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (open) {
      setSearch("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action()
          onOpenChange(false)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, filteredItems, selectedIndex, onOpenChange])

  // Group items by category
  const categories = ["导航", "系统操作"] as const

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border/40 shadow-2xl rounded-xl">
        <div className="flex items-center px-4 border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Search className="size-4 mr-3 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="输入关键字进行搜索与快捷操作..."
            className="w-full h-12 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              未找到匹配的命令或页面
            </div>
          ) : (
            categories.map((category) => {
              const categoryItems = filteredItems.filter((item) => item.category === category)
              if (categoryItems.length === 0) return null

              return (
                <div key={category} className="space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {category}
                  </div>
                  {categoryItems.map((item) => {
                    const globalIndex = filteredItems.indexOf(item)
                    const isSelected = globalIndex === selectedIndex

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action()
                          onOpenChange(false)
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-150 text-left",
                          isSelected
                            ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                        )}
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
            })
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ 移动</span>
            <span>↵ 选择</span>
            <span>esc 关闭</span>
          </div>
          <div className="font-mono">LSDB Command Palette</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
