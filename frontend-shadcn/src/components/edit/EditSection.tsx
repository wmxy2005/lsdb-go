import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/40 bg-card/40 shadow-sm backdrop-blur-sm rounded-xl overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-5 border-b border-border/30 bg-zinc-50/30 dark:bg-zinc-900/10">
        <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">{children}</CardContent>
    </Card>
  );
}
