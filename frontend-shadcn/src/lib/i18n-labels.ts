import { CONFIG } from '@/constants';
import type { TFunction } from 'i18next';

export function resBaseLabel(t: TFunction, name: string) {
  const key = name || 'all';
  return t(`config.resBase.${key}`, { defaultValue: CONFIG.resBaseList.find((b) => (b.name || 'all') === key)?.label ?? name });
}

export function resTypeLabel(t: TFunction, name: string) {
  if (!name) return t('config.all');
  return CONFIG.resTypeList.find((item) => item.name === name)?.label ?? name;
}
