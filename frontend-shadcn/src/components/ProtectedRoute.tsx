import { UnauthorizedGate } from '@/components/auth/UnauthorizedGate'
import { Skeleton } from '@/components/ui/skeleton'
import { getToken } from '@/api/client'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  // On a hard refresh the auth check (authCurrent) and the page's own data
  // fetch run as two sequential phases, each with its own skeleton — the user
  // sees this gate skeleton flash before the page skeleton. When a session
  // token already exists we're only re-validating, so render the page
  // optimistically: it shows its own skeleton and fetches in parallel with the
  // auth check. If the session turns out invalid, auth resolves to
  // unauthenticated and we fall back to the gate below.
  if (loading && getToken()) {
    return children
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <UnauthorizedGate />
  }

  return children
}
