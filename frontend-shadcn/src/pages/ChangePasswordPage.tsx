import { authChangePassword } from '@/api/auth'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePageTitle } from '@/hooks/use-page-title-context'
import { apiErrorMessage } from '@/lib/api-error'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function ChangePasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  usePageTitle(t('nav.changePassword'))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error(t('auth.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'))
      return
    }

    setLoading(true)
    const res = await authChangePassword(currentPassword, newPassword)
    if (res.success) {
      toast.success(t('toast.changePasswordSuccess'))
      navigate('/items')
    } else {
      toast.error(apiErrorMessage(t, res.message, 'toast.changePasswordFailed'))
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center">
      <div className="mx-auto w-full max-w-md pb-4">
        <Card className="overflow-hidden rounded-xl border-border/40 bg-card shadow-lg">
          <CardContent className="p-8 pt-10">
            <div className="mb-6 border-b border-border/60 pb-3 text-center text-sm font-medium text-foreground">
              {t('auth.changePasswordTitle')}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordInput
                id="current-password"
                placeholder={t('auth.currentPasswordPlaceholder')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <PasswordInput
                id="new-password"
                placeholder={t('auth.newPasswordPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordInput
                id="confirm-new-password"
                placeholder={t('auth.confirmNewPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {t('auth.changingPassword')}
                  </span>
                ) : (
                  t('auth.changePasswordSubmit')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
