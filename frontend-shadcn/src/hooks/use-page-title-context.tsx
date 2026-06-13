import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const DEFAULT_DOCUMENT_TITLE = 'LSDB';

type PageTitleContextValue = {
  breadcrumbLabel: string | null;
  setBreadcrumbLabel: (label: string | null) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [breadcrumbLabel, setBreadcrumbLabelState] = useState<string | null>(null);
  const setBreadcrumbLabel = useCallback((label: string | null) => {
    setBreadcrumbLabelState(label);
  }, []);
  const value = useMemo(
    () => ({ breadcrumbLabel, setBreadcrumbLabel }),
    [breadcrumbLabel, setBreadcrumbLabel],
  );
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function usePageBreadcrumbLabel() {
  return useContext(PageTitleContext)?.breadcrumbLabel ?? null;
}

export function usePageTitle(
  title: string | null | undefined,
  breadcrumbLabel?: string | null | undefined,
) {
  const setBreadcrumbLabel = useContext(PageTitleContext)?.setBreadcrumbLabel;

  useEffect(() => {
    // Only update the tab title once a real title is ready — don't flash the
    // default ("LSDB") while the page is still loading or when navigating away.
    if (title?.trim()) {
      document.title = title;
    }
    setBreadcrumbLabel?.(breadcrumbLabel?.trim() ? breadcrumbLabel : null);

    return () => {
      setBreadcrumbLabel?.(null);
    };
  }, [title, breadcrumbLabel, setBreadcrumbLabel]);
}
