import { LoginPanel } from '@/components/auth/LoginPanel'
import { useAuth } from '@/hooks/use-auth'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: string })?.from ?? '/items'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, from, navigate])

  const handleSuccess = () => {
    navigate(from, { replace: true })
  }

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center">
      <LoginPanel onSuccess={handleSuccess} />
    </div>
  )
}
