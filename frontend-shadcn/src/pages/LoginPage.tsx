import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string })?.from ?? '/items';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(username, password);
    if (res.success) {
      navigate(from, { replace: true });
    } else {
      toast.error(res.message ?? '登录失败');
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 transition-colors duration-300">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-0 right-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-indigo-500/5 blur-[100px] dark:bg-indigo-500/10" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[100px] dark:bg-emerald-500/10" />

      <div className="w-full max-w-md space-y-6 animate-fade-in-up">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:scale-105">
            <img src="/logo.svg" alt="Logo" className="size-7 invert dark:invert-0" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            LSDB Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            轻量级系统资源与技术档案管理平台
          </p>
        </div>

        <Card className="border-border/40 bg-card/60 shadow-xl shadow-zinc-200/20 dark:shadow-none backdrop-blur-md rounded-xl overflow-hidden">
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-xl font-semibold tracking-tight text-center sm:text-left">
              系统登录
            </CardTitle>
            <CardDescription className="text-center sm:text-left">
              请输入您的管理员凭证以访问控制台
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  用户名
                </Label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="username"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="pl-9 bg-background/50 border-border/60 focus-visible:ring-indigo-500 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  密码
                </Label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 bg-background/50 border-border/60 focus-visible:ring-indigo-500 rounded-lg"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-10 mt-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-all duration-200 shadow-sm shadow-primary/10"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    安全登录中...
                  </span>
                ) : (
                  '登录控制台'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          Copyright © 2026 By wmxy2005. All rights reserved.
        </div>
      </div>
    </div>
  );
}
