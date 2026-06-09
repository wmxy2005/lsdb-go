import { CONFIG } from '@/constants/config';
import type { TFunction } from 'i18next';

export function resBaseLabel(t: TFunction, name: string) {
  const key = name || 'all';
  return t(`config.resBase.${key}`, { defaultValue: CONFIG.resBaseList.find((b) => (b.name || 'all') === key)?.label ?? name });
}

export function resTypeLabel(t: TFunction, name: string) {
  if (!name) return t('config.all');
  if (name === '0') return t('config.type0');
  if (name === '1') return t('config.type1');
  return CONFIG.resTypeList.find((item) => item.name === name)?.label ?? name;
}
