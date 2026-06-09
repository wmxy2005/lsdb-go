import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from '@/locales/en-US.json';
import zhCN from '@/locales/zh-CN.json';

const LOCALE_KEY = 'lsdb-locale';
const SUPPORTED = ['zh-CN', 'en-US'] as const;
export type AppLocale = (typeof SUPPORTED)[number];

function getInitialLocale(): AppLocale {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === 'zh-CN' || stored === 'en-US') return stored;
  const browser = navigator.language;
  if (browser.startsWith('zh')) return 'zh-CN';
  return 'en-US';
}

const initialLocale = getInitialLocale();
document.documentElement.lang = initialLocale;

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
  },
  lng: initialLocale,
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LOCALE_KEY, lng);
  document.documentElement.lang = lng;
});

export default i18n;
export { LOCALE_KEY, SUPPORTED };
