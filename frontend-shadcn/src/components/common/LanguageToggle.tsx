import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AppLocale } from '@/i18n';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LOCALES: { code: AppLocale; labelKey: string }[] = [
  { code: 'zh-CN', labelKey: 'layout.language.zh' },
  { code: 'en-US', labelKey: 'layout.language.en' },
];

const LOCALE_BADGE: Record<AppLocale, string> = {
  'zh-CN': '中',
  'en-US': 'EN',
};

function normalizeLocale(lng: string): AppLocale {
  return lng.startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const current = normalizeLocale(i18n.language);
  const currentLabelKey = current === 'zh-CN' ? 'layout.language.zh' : 'layout.language.en';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 min-w-8 rounded-full border-border/60 bg-background/50 px-2.5 text-xs font-semibold text-muted-foreground shadow-none hover:bg-accent hover:text-foreground"
          aria-label={t('layout.language.toggle')}
          title={t(currentLabelKey)}
        >
          {LOCALE_BADGE[current]}
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
