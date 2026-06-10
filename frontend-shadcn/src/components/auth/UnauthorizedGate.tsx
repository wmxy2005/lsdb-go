import { UnauthorizedIllustration } from '@/components/auth/UnauthorizedIllustration'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

export function UnauthorizedGate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center text-center">
      <UnauthorizedIllustration />
      <h2 className="mt-6 text-xl font-semibold">{t('auth.alreadyLogout')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t('auth.pleaseLogin')}</p>
      <Button
        className="mt-6"
        onClick={() =>
          navigate('/login', {
            state: { from: location.pathname + location.search },
          })
        }
      >
        {t('auth.submit')}
      </Button>
    </div>
  )
}
