import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/authStore'
import { Button } from '../ui/Button'

/** Full-width sign out, for phones (the desktop sidebar has its own small button). */
export function SignOutButton() {
  const signOut = useAuth((s) => s.signOut)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return (
    <Button
      variant="danger"
      block
      icon={<LogOut className="size-4.5" />}
      onClick={() => {
        signOut()
        queryClient.clear()
        navigate('/')
      }}
    >
      Sign out
    </Button>
  )
}
