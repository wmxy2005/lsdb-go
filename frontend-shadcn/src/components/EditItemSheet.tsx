import { deleteResource, uploadResource } from "@/api/resource";
import { newItem, queryItem, updateItem } from "@/api/items";
import type { ItemInfo } from "@/api/types";
import { EditImageList } from "@/components/edit/EditImageList";
import {
  isMediaPreviewActive,
  isMediaPreviewTarget,
  MediaPreviewProvider,
  type VideoPreviewState,
} from "@/components/edit/MediaPreview";
import { EditMediaSection } from "@/components/edit/EditMediaSection";
import { EditResourceList } from "@/components/edit/EditResourceList";
import type { FileOption } from "@/components/edit/EditResourceList";
import { EditSection } from "@/components/edit/EditSection";
import { EditTagInput } from "@/components/EditTagInput";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { ClearableInput } from "@/components/ui/clearable-input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { guardHistoryBack } from "@/lib/history-guard";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Save, FolderOpen, FileText, RotateCcw } from "lucide-react";
import { apiErrorMessage } from "@/lib/api-error";

function EditSheetSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="space-y-4 rounded-xl border border-border/40 p-5 bg-card/30"
        >
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

const IMAGE_FILE_PATTERN = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;

function isGalleryImageFile(f: FileOption): boolean {
  if (f.type === "image" || f.type === "thumbnail") return true;
  if (f.type === "file" || !f.type) return IMAGE_FILE_PATTERN.test(f.name);
  return false;
}

function isPhotoSwipeTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(".pswp"));
}

function isPhotoSwipeActive() {
  return document.querySelector(".pswp") !== null;
}

function PathBreadcrumb({ parts }: { parts: string[] }) {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-1.5 font-mono truncate max-w-full">
      <FolderOpen className="size-3 text-zinc-400 shrink-0" />
      <span>{filtered.join(" / ")}</span>
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
  const { t, i18n } = useTranslation();
  const isNew = itemId <= 0;
  const { data, isLoading } = useQuery({
    queryKey: ["item-edit", itemId],
    queryFn: () => queryItem(itemId),
    enabled: open && itemId > 0,
  });
  const item: ItemInfo | undefined = data?.success ? data.data : undefined;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");
  const [base, setBase] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [name, setName] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [roll, setRoll] = useState("");
  const [trailer, setTrailer] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tags2, setTags2] = useState<string[]>([]);
  const [tags3, setTags3] = useState<string[]>([]);
  const [imgList, setImgList] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [videoPreview, setVideoPreview] = useState<VideoPreviewState>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) setVideoPreview(null);
  }, [open]);

  // Browser Back closes the sheet instead of navigating away. Nested overlays
  // (image/video preview) register their own guard on top of this one, so Back
  // closes them first and only closes the sheet once they're gone. Keyed on the
  // `open` transition (not a mount) to stay clear of StrictMode's effect replay.
  useEffect(() => {
    if (!open) return;
    return guardHistoryBack(() => onOpenChange(false));
  }, [open, onOpenChange]);

  // Populate the form from the loaded item (or clear it when creating a new
  // one). Exposed as a callback so the Reset button can re-read the current
  // data and discard unsaved edits.
  const resetForm = useCallback(() => {
    setTitle(item?.title ?? "");
    setDate(String(item?.date ?? "").slice(0, 10));
    setContent(item?.content ?? "");
    setBase(item?.base ?? "");
    setCategory(item?.category ?? "");
    setSubcategory(item?.subcategory ?? "");
    setName(item?.name ?? "");
    setThumbnail(item?.thumbnail ?? "");
    setRoll(item?.roll ?? "");
    setTrailer(item?.trailer ?? "");
    const t1: string[] = [],
      t2: string[] = [],
      t3: string[] = [];
    item?.tagList?.forEach((entry) => {
      const v = entry.value ?? entry.name ?? "";
      if (entry.type === "tag") t1.push(v);
      else if (entry.type === "tag2") t2.push(v);
      else if (entry.type === "tag3") t3.push(v);
    });
    setTags(t1);
    setTags2(t2);
    setTags3(t3);
    const imgNames = (item?.imgList ?? [])
      .map((img) => img.value ?? img.name ?? "")
      .filter(Boolean);
    setImgList(imgNames);
  }, [item]);

  useEffect(() => {
    if (item) resetForm();
  }, [item, resetForm]);

  const fileOptions: FileOption[] = (item?.fileList ?? [])
    .map((f) => ({
      name: typeof f === "string" ? f : (f.value ?? ""),
      type: typeof f === "string" ? "file" : f.type,
    }))
    .filter((f) => f.name);

  const fileList = fileOptions.map((f) => f.name);
  const imageFileList = fileOptions
    .filter(isGalleryImageFile)
    .map((f) => f.name);
  const imageSizes = useMemo(() => {
    const sizes: Record<string, { width?: number; height?: number }> = {};
    item?.imgList?.forEach((img) => {
      const filename = img.value ?? img.name ?? "";
      if (!filename) return;
      sizes[filename] = {
        width: img.width ?? img.w,
        height: img.height ?? img.h,
      };
    });
    return sizes;
  }, [item?.imgList]);

  const resBase = item?.base ?? base;
  const resCategory = item?.category ?? category;
  const resSubcategory = item?.subcategory ?? subcategory;
  const resName = item?.name ?? name;
  const trimmedName = name.trim();
  const isRenameDirty = !isNew && trimmedName !== (item?.name ?? "");

  const buildPayload = () => ({
    title,
    date,
    content,
    base,
    category,
    subcategory,
    name: isNew ? trimmedName : name,
    thumbnail: thumbnail || "",
    roll: roll || "",
    trailer: trailer || "",
    tags,
    tags2,
    tags3,
    images: imgList,
  });

  const handleSave = async () => {
    if (!isNew && trimmedName === "") {
      toast.error(t("edit.rename.nameRequired"));
      return;
    }
    setSaving(true);
    const payload = buildPayload();
    const res = isNew
      ? await newItem(payload)
      : await updateItem(itemId, payload);
    if (res.success) {
      toast.success(t("toast.saveSuccess"));
      onOpenChange(false);
      onSaved?.();
    } else {
      toast.error(apiErrorMessage(t, res.message, "toast.saveFailed"));
    }
    setSaving(false);
  };

  const handleReset = () => {
    resetForm();
    toast.success(t("toast.resetDone"));
  };

  const resourcePath = (filename: string) => ({
    base: resBase,
    category: resCategory,
    subcategory: resSubcategory,
    name: resName,
    filename,
  });

  const refreshEditData = () => {
    queryClient.invalidateQueries({ queryKey: ["item-edit", itemId] });
    onSaved?.();
  };

  const uploadFile = async (file: File) => {
    const res = await uploadResource(resourcePath(file.name), file);
    if (res.success) {
      toast.success(t("toast.uploadSuccess"));
      refreshEditData();
    } else {
      toast.error(res.message ?? t("toast.uploadFailed"));
    }
  };

  const handleDeleteFile = async (filename: string) => {
    const res = await deleteResource(resourcePath(filename));
    if (res.success) {
      toast.success(t("toast.deleted"));
      refreshEditData();
    } else {
      toast.error(res.message ?? t("toast.deleteFailed"));
    }
  };

  const showLoading = !isNew && isLoading;

  const handleOpenChange = (next: boolean) => {
    if (
      !next &&
      (isPhotoSwipeActive() || isMediaPreviewActive() || videoPreview !== null)
    )
      return;
    if (!next) setVideoPreview(null);
    onOpenChange(next);
  };

  const isOutsidePreviewTarget = (target: EventTarget | null) =>
    isPhotoSwipeTarget(target) || isMediaPreviewTarget(target);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-40 bg-black/50 animate-fade-in"
            aria-hidden="true"
          />,
          document.body,
        )}
      <SheetContent
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-2xl border-l border-border/40 bg-background/95 backdrop-blur-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (isOutsidePreviewTarget(e.target)) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isOutsidePreviewTarget(e.target)) e.preventDefault();
        }}
        onFocusOutside={(e) => {
          if (isOutsidePreviewTarget(e.target)) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isPhotoSwipeActive() || isMediaPreviewActive())
            e.preventDefault();
        }}
      >
        <MediaPreviewProvider
          videoPreview={videoPreview}
          onVideoPreviewChange={setVideoPreview}
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/40 px-6 py-5 text-left relative bg-zinc-50/50 dark:bg-zinc-900/10">
            <SheetTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {isNew ? t("edit.sheet.titleNew") : t("edit.sheet.titleEdit")}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {t("edit.sheet.description")}
            </SheetDescription>
            {!isNew && item && (
              <PathBreadcrumb
                parts={[
                  item.base ?? "",
                  item.category ?? "",
                  item.subcategory ?? "",
                  item.name ?? "",
                ]}
              />
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {showLoading ? (
              <EditSheetSkeleton />
            ) : (
              <div className="space-y-6">
                <EditSection title={t("edit.section.storagePath")}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {t("edit.field.base")}
                      </Label>
                      <ClearableInput
                        value={base}
                        onChange={(e) => setBase(e.target.value)}
                        placeholder={t("edit.field.basePlaceholder")}
                        className="h-9 bg-background/50 border-border/60 rounded-lg text-xs"
                        clearLabel={t("common.clear")}
                        disabled={!isNew}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {t("edit.field.category")}
                      </Label>
                      <ClearableInput
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder={t("edit.field.categoryPlaceholder")}
                        className="h-9 bg-background/50 border-border/60 rounded-lg text-xs"
                        clearLabel={t("common.clear")}
                        disabled={!isNew}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {t("edit.field.subcategory")}
                      </Label>
                      <ClearableInput
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        placeholder={t("edit.field.subcategoryPlaceholder")}
                        className="h-9 bg-background/50 border-border/60 rounded-lg text-xs"
                        clearLabel={t("common.clear")}
                        disabled={!isNew}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {t("edit.field.name")}
                      </Label>
                      <ClearableInput
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("edit.field.namePlaceholder")}
                        className="h-9 bg-background/50 border-border/60 rounded-lg text-xs"
                        clearLabel={t("common.clear")}
                      />
                    </div>
                  </div>
                  {!isNew && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {isRenameDirty
                        ? t("edit.rename.pendingHint")
                        : t("edit.rename.hint")}
                    </p>
                  )}
                </EditSection>

                <EditSection title={t("edit.section.basicInfo")}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {t("edit.field.title")}
                      </Label>
                      <div className="relative">
                        <FileText className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                        <ClearableInput
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={t("edit.field.titlePlaceholder")}
                          className="pl-9 h-9 bg-background/50 border-border/60 rounded-lg text-xs"
                          clearLabel={t("common.clear")}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {t("edit.field.publishDate")}
                      </Label>
                      <DatePicker
                        value={date}
                        onChange={setDate}
                        locale={i18n.language}
                        placeholder={t("items.filter.datePlaceholder")}
                        todayLabel={t("items.filter.dateToday")}
                        clearLabel={t("items.filter.dateClear")}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {t("edit.field.content")}
                    </Label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t("edit.field.contentPlaceholder")}
                      rows={5}
                      className="bg-background/50 border-border/60 rounded-lg text-xs resize-none leading-relaxed"
                    />
                  </div>
                </EditSection>

                <EditSection title={t("edit.section.tags")}>
                  <div className="space-y-4">
                    <EditTagInput
                      label={t("edit.tag.primary")}
                      tags={tags}
                      onChange={setTags}
                    />
                    <EditTagInput
                      label={t("edit.tag.secondary")}
                      tags={tags2}
                      onChange={setTags2}
                    />
                    <EditTagInput
                      label={t("edit.tag.tertiary")}
                      tags={tags3}
                      onChange={setTags3}
                    />
                  </div>
                </EditSection>

                <EditSection title={t("edit.section.media")}>
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

                <EditSection title={t("edit.section.gallery")}>
                  <EditImageList
                    imgList={imgList}
                    onChange={setImgList}
                    imageSizes={imageSizes}
                    availableFiles={imageFileList}
                    base={resBase}
                    category={resCategory}
                    subcategory={resSubcategory}
                    name={resName}
                  />
                </EditSection>

                {!isNew && (
                  <EditSection title={t("edit.section.resources")}>
                    <EditResourceList
                      files={fileOptions}
                      onDelete={handleDeleteFile}
                      onUpload={uploadFile}
                    />
                  </EditSection>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2.5 border-t border-border/40 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10">
            {!isNew ? (
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={saving || showLoading}
                className="h-9 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="size-3.5" />
                {t("edit.reset")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={saving}
                className="h-9 rounded-lg text-xs font-semibold border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || showLoading}
                className="h-9 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm shadow-primary/10 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("edit.saving")}
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    {t("edit.save")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </MediaPreviewProvider>
      </SheetContent>
    </Sheet>
  );
}
