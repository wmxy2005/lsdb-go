import { deleteResource, uploadResource } from '@/api/resource';
import { newItem, queryItem, updateItem } from '@/api/items';
import type { ItemInfo } from '@/api/types';
import { EditImageList } from '@/components/edit/EditImageList';
import { EditMediaSection } from '@/components/edit/EditMediaSection';
import { EditResourceList } from '@/components/edit/EditResourceList';
import type { FileOption } from '@/components/edit/EditResourceList';
import { EditSection } from '@/components/edit/EditSection';
import { EditTagInput } from '@/components/EditTagInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, X, FolderOpen, Tag, Calendar, FileText } from 'lucide-react';

function EditSheetSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4 rounded-xl border border-border/40 p-5 bg-card/30">
          <Skeleton className="h-5 w-24 rounded-md" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PathBreadcrumb({ parts }: { parts: string[] }) {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-1.5 font-mono truncate max-w-full">
      <FolderOpen className="size-3 text-zinc-400 shrink-0" />
      <span>{filtered.join(' / ')}</span>
    </div>
  );
}

export function EditItemSheet({
  itemId,
  open,
  onOpenChange,
  onSaved,
}: {
  itemId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const isNew = itemId <= 0;
  const { data, isLoading } = useQuery({
    queryKey: ['item-edit', itemId],
    queryFn: () => queryItem(itemId),
    enabled: open && itemId > 0,
  });
  const item: ItemInfo | undefined = data?.success ? data.data : undefined;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [base, setBase] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [name, setName] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [roll, setRoll] = useState('');
  const [trailer, setTrailer] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tags2, setTags2] = useState<string[]>([]);
  const [tags3, setTags3] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!item) return;
    setTitle(item.title ?? '');
    setDate(String(item.date ?? '').slice(0, 10));
    setContent(item.content ?? '');
    setBase(item.base ?? '');
    setCategory(item.category ?? '');
    setSubcategory(item.subcategory ?? '');
    setName(item.name ?? '');
    setThumbnail(item.thumbnail ?? '');
    setRoll(item.roll ?? '');
    setTrailer(item.trailer ?? '');
    const t1: string[] = [], t2: string[] = [], t3: string[] = [];
    item.tagList?.forEach((t) => {
      const v = t.value ?? t.name ?? '';
      if (t.type === 'tag') t1.push(v);
      else if (t.type === 'tag2') t2.push(v);
      else if (t.type === 'tag3') t3.push(v);
    });
    setTags(t1);
    setTags2(t2);
    setTags3(t3);
    const imgNames = (item.imgList ?? [])
      .map((img) => img.value ?? img.name ?? '')
      .filter(Boolean);
    setImages(imgNames);
  }, [item]);

  const fileOptions: FileOption[] = (item?.fileList ?? [])
    .map((f) => ({
      name: typeof f === 'string' ? f : f.value ?? '',
      type: typeof f === 'string' ? 'file' : f.type,
    }))
    .filter((f) => f.name);

  const fileList = fileOptions.map((f) => f.name);

  const resBase = item?.base ?? base;
  const resCategory = item?.category ?? category;
  const resSubcategory = item?.subcategory ?? subcategory;
  const resName = item?.name ?? name;

  const buildPayload = () => ({
    title,
    date,
    content,
    base,
    category,
    subcategory,
    name,
    thumbnail: thumbnail || '',
    roll: roll || '',
    trailer: trailer || '',
    tags,
    tags2,
    tags3,
    images,
  });

  const handleSave = async () => {
    setSaving(true);
    const payload = buildPayload();
    const res = isNew ? await newItem(payload) : await updateItem(itemId, payload);
    if (res.success) {
      toast.success('保存成功');
      onOpenChange(false);
      onSaved?.();
    } else {
      toast.error(res.message ?? '保存失败');
    }
    setSaving(false);
  };

  const resourcePath = (filename: string) => ({
    base: resBase,
    category: resCategory,
    subcategory: resSubcategory,
    name: resName,
    filename,
  });

  const refreshEditData = () => {
    queryClient.invalidateQueries({ queryKey: ['item-edit', itemId] });
    onSaved?.();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadResource(resourcePath(file.name), file);
    if (res.success) {
      toast.success('上传成功');
      refreshEditData();
    } else {
      toast.error(res.message ?? '上传失败');
    }
    e.target.value = '';
  };

  const handleDeleteFile = async (filename: string) => {
    const res = await deleteResource(resourcePath(filename));
    if (res.success) {
      toast.success('已删除');
      refreshEditData();
    } else {
      toast.error(res.message ?? '删除失败');
    }
  };

  const showLoading = !isNew && isLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-2xl border-l border-border/40 bg-background/95 backdrop-blur-md">
        <SheetHeader className="shrink-0 space-y-1 border-b border-border/40 px-6 py-5 text-left relative bg-zinc-50/50 dark:bg-zinc-900/10">
          <SheetTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isNew ? '新建档案' : '编辑档案'}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            修改档案元数据、标签关联、媒体配置与图集资源。
          </SheetDescription>
          {!isNew && item && (
            <PathBreadcrumb parts={[item.base ?? '', item.category ?? '', item.subcategory ?? '', item.name ?? '']} />
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {showLoading ? (
            <EditSheetSkeleton />
          ) : (
            <div className="space-y-6">
              {isNew && (
                <EditSection title="存储路径配置">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Base (根目录)</Label>
                      <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="例如: base_folder" className="h-9 bg-background/50 border-border/60 rounded-lg text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Category (主分类)</Label>
                      <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例如: category_folder" className="h-9 bg-background/50 border-border/60 rounded-lg text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Subcategory (子分类)</Label>
                      <Input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="例如: subcategory_folder" className="h-9 bg-background/50 border-border/60 rounded-lg text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Name (档案名称)</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如: archive_name" className="h-9 bg-background/50 border-border/60 rounded-lg text-xs" />
                    </div>
                  </div>
                </EditSection>
              )}

              <EditSection title="基本信息">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">档案标题</Label>
                    <div className="relative">
                      <FileText className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入档案标题" className="pl-9 h-9 bg-background/50 border-border/60 rounded-lg text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">发布日期</Label>
                    <div className="relative">
                      <Calendar className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-9 h-9 bg-background/50 border-border/60 rounded-lg text-xs" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">详细描述内容</Label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="请输入档案的详细描述内容..." rows={5} className="bg-background/50 border-border/60 rounded-lg text-xs resize-none leading-relaxed" />
                </div>
              </EditSection>

              <EditSection title="标签关联配置">
                <div className="space-y-4">
                  <EditTagInput label="标签 (主标签)" tags={tags} onChange={setTags} />
                  <EditTagInput label="标签2 (次级标签)" tags={tags2} onChange={setTags2} />
                  <EditTagInput label="标签3 (辅助标签)" tags={tags3} onChange={setTags3} />
                </div>
              </EditSection>

              <EditSection title="核心媒体配置">
                <EditMediaSection
                  fileList={fileList}
                  thumbnail={thumbnail}
                  roll={roll}
                  trailer={trailer}
                  onThumbnailChange={setThumbnail}
                  onRollChange={setRoll}
                  onTrailerChange={setTrailer}
                  base={resBase}
                  category={resCategory}
                  subcategory={resSubcategory}
                  name={resName}
                />
              </EditSection>

              <EditSection title="高清图集关联">
                <EditImageList
                  images={images}
                  onChange={setImages}
                  availableFiles={fileList}
                  base={resBase}
                  category={resCategory}
                  subcategory={resSubcategory}
                  name={resName}
                />
              </EditSection>

              {!isNew && (
                <EditSection title="资源文件管理">
                  <EditResourceList
                    files={fileOptions}
                    onDelete={handleDeleteFile}
                    onUpload={handleUpload}
                  />
                </EditSection>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2.5 border-t border-border/40 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-9 rounded-lg text-xs font-semibold border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || showLoading}
            className="h-9 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm shadow-primary/10 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                正在保存...
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                保存档案
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
