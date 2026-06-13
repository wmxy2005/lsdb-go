import { openFolder } from '@/api/cmd';
import { queryRole } from '@/api/role';
import { PageActionButton, PageActions } from '@/components/common/PageActions';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePageTitle } from '@/hooks/use-page-title-context';
import { resolveTagUrl } from '@/lib/resource-url';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, ChevronLeft, Calendar, Tag, Image as ImageIcon, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function RolePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const roleId = Number(id);
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => queryRole(roleId),
    enabled: roleId > 0,
  });

  const role = data?.success ? data.data : undefined;

  usePageTitle(role?.title ?? t('breadcrumb.roleManagement'), role?.title);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-1/3 rounded-md" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data?.success || !role) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const handleOpenFolder = async () => {
    const path = `${role.base}/e${role.id}`;
    const res = await openFolder(path);
    if (res.success) toast.success(t('toast.openFolderSuccess'));
    else toast.error(res.message ?? t('toast.openFolderFailed'));
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Back Button & Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            title={t('common.back')}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
            <span>{t('role.management')}</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span>{role.base}</span>
          </div>
        </div>
        <PageActions>
          <PageActionButton
            variant="outline"
            icon={<FolderOpen className="size-4" />}
            label={t('action.openFolder')}
            onClick={handleOpenFolder}
            className="h-9 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-xs font-medium"
          />
        </PageActions>
      </div>

      {/* Main Title Section */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
          {role.title}
        </h1>
        {role.date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Calendar className="size-3.5 text-zinc-400" />
            <span>{t('common.publishedOn', { date: String(role.date).slice(0, 10) })}</span>
          </div>
        )}
      </div>

      {/* Tags Grid */}
      {(role.nameList ?? []).length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {(role.nameList ?? []).map((name, i) => {
            const tagName = (name as { value?: string; name?: string }).value ?? (name as { name?: string }).name ?? '';
            return (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer text-xs px-3 py-1 rounded-md border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 transition-all duration-200 hover:scale-[1.02]"
                onClick={() => navigate(resolveTagUrl('tag', tagName))}
              >
                <Tag className="size-3 mr-1 opacity-70" />
                {tagName}
              </Badge>
            );
          })}
        </div>
      )}

      <Separator className="opacity-40" />

      {/* Media & Content Area */}
      <div className="space-y-8">
        {/* Image List */}
        {role.imageList && role.imageList.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <ImageIcon className="size-4" />
              <span>{t('role.section.gallery')}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {role.imageList.map((img, i) => (
                <div key={i} className="group relative aspect-image overflow-hidden rounded-xl border border-border/40 bg-muted shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
                  <img
                    src={img.imageSrc ?? img.url}
                    alt={img.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remark Area */}
        {role.remark && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <BookOpen className="size-4" />
              <span>{t('role.section.notes')}</span>
            </div>
            <Card className="border-border/40 bg-card/40 shadow-sm backdrop-blur-sm rounded-xl">
              <CardContent className="p-6">
                <div
                  className="prose prose-content dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: role.remark }}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
