import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { useAuth } from '@/hooks/use-auth'
import { apiErrorMessage } from '@/lib/api-error'
import { Loader2, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function LoginPanel({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation()
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'))
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isRegister) {
      if (password.length < 6) {
        toast.error(t('auth.passwordTooShort'))
        return
      }
      if (password !== confirmPassword) {
        toast.error(t('auth.passwordMismatch'))
        return
      }
    }

    setLoading(true)
    const res = isRegister ? await register(username, password) : await login(username, password)
    if (res.success) {
      onSuccess?.()
    } else {
      toast.error(apiErrorMessage(t, res.message, isRegister ? 'toast.registerFailed' : 'toast.loginFailed'))
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
            {t(isRegister ? 'auth.accountRegister' : 'auth.accountLogin')}
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
            <PasswordInput
              id="login-password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isRegister && (
              <PasswordInput
                id="login-confirm-password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t(isRegister ? 'auth.registering' : 'auth.loggingIn')}
                </span>
              ) : (
                t(isRegister ? 'auth.registerSubmit' : 'auth.submit')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t(isRegister ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {t(isRegister ? 'auth.toLogin' : 'auth.toRegister')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
