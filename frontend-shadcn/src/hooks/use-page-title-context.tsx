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
    document.title = title?.trim() ? title : DEFAULT_DOCUMENT_TITLE;
    setBreadcrumbLabel?.(breadcrumbLabel?.trim() ? breadcrumbLabel : null);

    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
      setBreadcrumbLabel?.(null);
    };
  }, [title, breadcrumbLabel, setBreadcrumbLabel]);
}
