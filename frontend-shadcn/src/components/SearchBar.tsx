import { ClearableInput } from '@/components/ui/clearable-input';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { loadItemsSortPreference } from '@/lib/items-page-cache';

export function SearchBar({
  variant = 'desktop',
  onSubmitted,
  className,
}: {
  variant?: 'desktop' | 'mobile';
  onSubmitted?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    const params = new URLSearchParams({ keyword: keyword.trim() });
    const sort = loadItemsSortPreference();
    if (sort) params.set('sort', sort);
    navigate(`/items?${params.toString()}`);
    onSubmitted?.();
  };

  const isMobile = variant === 'mobile';

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative',
        isMobile ? 'w-full' : 'hidden md:block',
        className,
      )}
    >
      <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <ClearableInput
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={t('search.placeholder')}
        className={cn('pl-8', isMobile ? 'w-full' : 'w-48 lg:w-64')}
        clearLabel={t('common.clear')}
      />
    </form>
  );
}
