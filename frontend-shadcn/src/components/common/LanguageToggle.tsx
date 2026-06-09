import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AppLocale } from '@/i18n';
import { Check, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LOCALES: { code: AppLocale; labelKey: string }[] = [
  { code: 'zh-CN', labelKey: 'layout.language.zh' },
  { code: 'en-US', labelKey: 'layout.language.en' },
];

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const current = i18n.language as AppLocale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          aria-label={t('layout.language.toggle')}
        >
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem] rounded-xl p-1.5 border border-border/40">
        {LOCALES.map(({ code, labelKey }) => (
          <DropdownMenuItem
            key={code}
            className="rounded-lg cursor-pointer"
            onClick={() => void i18n.changeLanguage(code)}
          >
            <span className="flex-1">{t(labelKey)}</span>
            {current === code && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
