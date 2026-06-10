import { Lock, Monitor } from 'lucide-react'

export function UnauthorizedIllustration() {
  return (
    <div
      className="relative inline-flex h-[295px] w-[250px] max-w-[72vw] items-center justify-center"
      aria-hidden="true"
    >
      <div className="absolute size-[230px] max-w-[66vw] rounded-full border border-primary/15 bg-[radial-gradient(circle_at_34%_28%,rgba(255,255,255,0.9),transparent_34%),linear-gradient(145deg,rgba(214,93,58,0.14),rgba(214,93,58,0.05))]" />

      <div className="relative flex h-[126px] w-[190px] max-w-[55vw] flex-col rounded-[10px] border border-primary/20 bg-white/95 shadow-[0_20px_42px_rgba(214,93,58,0.16),0_10px_20px_rgba(15,23,42,0.09)] dark:bg-zinc-900/95">
        <div className="flex h-[18px] items-center gap-[5px] bg-gradient-to-r from-primary to-[#e8704d] px-3">
          <span className="size-[5px] rounded-full bg-white/70" />
          <span className="size-[5px] rounded-full bg-white/70" />
          <span className="size-[5px] rounded-full bg-white/70" />
        </div>

        <div className="relative grid flex-1 grid-cols-[52px_minmax(0,1fr)] items-center gap-[13px] bg-[linear-gradient(90deg,rgba(214,93,58,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(214,93,58,0.05)_1px,transparent_1px),rgba(255,255,255,0.92)] bg-[length:18px_18px] px-[18px] pt-4 pb-[18px] dark:bg-zinc-900/80">
          <span className="inline-flex size-[52px] items-center justify-center rounded-full border border-primary/15 bg-primary/10">
            <img src="/logo.svg" alt="" className="w-8" />
          </span>

          <span className="flex min-w-0 flex-col gap-2">
            <span className="block h-2 w-[68%] rounded-full bg-primary/25" />
            <span className="block h-2 w-full rounded-full bg-slate-900/10 dark:bg-white/10" />
            <span className="block h-2 w-[46%] rounded-full bg-slate-900/10 dark:bg-white/10" />
          </span>

          <span className="absolute top-[13px] right-[15px] inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[11px] font-bold leading-none text-[#b4492d]">
            403
          </span>
        </div>

        <Monitor className="absolute right-[18px] bottom-[13px] size-7 text-slate-900/20 dark:text-white/20" />

        <span className="absolute -right-3.5 -bottom-3.5 z-[3] inline-flex size-12 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-[0_10px_22px_rgba(214,93,58,0.28)]">
          <Lock className="size-5" />
        </span>
      </div>

      <div className="absolute bottom-[86px] h-7 w-8 rounded-b-md bg-gradient-to-b from-primary/20 to-slate-900/10" />
      <div className="absolute bottom-[72px] h-3 w-[92px] rounded-full bg-slate-900/10 shadow-[0_12px_24px_rgba(15,23,42,0.08)]" />
      <div className="absolute bottom-[58px] left-7 h-2.5 w-[72px] rounded-full bg-primary/20" />
      <div className="absolute right-[30px] bottom-[38px] h-2.5 w-[104px] rounded-full bg-slate-900/10" />
    </div>
  )
}
