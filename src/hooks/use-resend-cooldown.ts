import { useEffect, useState } from 'react'

const RESEND_COOLDOWN_SECONDS = 15

export function useResendCooldown() {
  const [remaining, setRemaining] = useState(RESEND_COOLDOWN_SECONDS)

  useEffect(() => {
    if (remaining === 0) return

    const timer = setTimeout(() => setRemaining((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  return { remaining, restart: () => setRemaining(RESEND_COOLDOWN_SECONDS) }
}
