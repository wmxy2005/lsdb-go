import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, Lock, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function LoginPanel({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await login(username, password)
    if (res.success) {
      onSuccess?.()
    } else {
      toast.error(res.message ?? t('toast.loginFailed'))
    }
    setLoading(false)
  }

  return (
    <div className="mx-auto w-full max-w-md pb-4">
      <Card className="overflow-hidden rounded-xl border-border/40 bg-card shadow-lg">
        <CardContent className="p-8 pt-10">
          <div className="mb-8 flex flex-col items-center space-y-2 text-center">
            <img src="/favicon.svg" alt="" className="size-11" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight">{t('auth.brandTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('auth.platformTagline')}</p>
          </div>

          <div className="mb-6 border-b border-border/60 pb-3 text-center text-sm font-medium text-foreground">
            {t('auth.accountLogin')}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-username"
                placeholder={t('auth.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11 pl-9"
              />
            </div>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 pl-9"
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t('auth.loggingIn')}
                </span>
              ) : (
                t('auth.submit')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
