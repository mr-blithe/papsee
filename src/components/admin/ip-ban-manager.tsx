'use client'

import { useState } from 'react'
import { Loader2, ShieldBan, ShieldOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PanelCard, PanelCardHeader } from '@/components/panel/panel-card'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useRouter } from '@/i18n/navigation'
import { AdminApiError, blockIpAddress, unblockIpAddress } from '@/lib/admin/client'
import { apiErrorKey, type ApiErrorMessageKey } from '@/lib/api'

export interface BannedIpView {
  id: string
  ip: string
  reason: string | null
  bannedBy: string | null
  blockedAt: string
}

export function IpBanManager({ bans }: { bans: BannedIpView[] }) {
  const t = useTranslations('AdminIpBans')
  const errors = useTranslations('ApiErrors')
  const router = useRouter()

  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<ApiErrorMessageKey | null>(null)
  const [revoked, setRevoked] = useState<number | null>(null)

  const add = async () => {
    setAdding(true)
    setErrorKey(null)
    setRevoked(null)

    try {
      const { revokedSessions } = await blockIpAddress(ip.trim(), reason.trim() || null)
      setIp('')
      setReason('')
      setRevoked(revokedSessions)
      router.refresh()
    } catch (error) {
      setErrorKey(apiErrorKey(error instanceof AdminApiError ? error.code : undefined))
    } finally {
      setAdding(false)
    }
  }

  const remove = async (id: string) => {
    setRemoving(id)
    setErrorKey(null)
    setRevoked(null)

    try {
      await unblockIpAddress(id)
      router.refresh()
    } catch (error) {
      setErrorKey(apiErrorKey(error instanceof AdminApiError ? error.code : undefined))
    } finally {
      setRemoving(null)
    }
  }

  return (
    <PanelCard>
      <PanelCardHeader title={t('title')} description={t('note')} />

      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ip">{t('ipLabel')}</FieldLabel>
            <Input
              id="ip"
              value={ip}
              inputMode="text"
              autoComplete="off"
              placeholder={t('ipPlaceholder')}
              onChange={(event) => setIp(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="reason">{t('reasonLabel')}</FieldLabel>
            <Input
              id="reason"
              value={reason}
              placeholder={t('reasonPlaceholder')}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="destructive" size="sm" disabled={!ip.trim() || adding} onClick={() => void add()}>
            {adding ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldBan aria-hidden />}
            {t('add')}
          </Button>
          {revoked !== null ? (
            <span className="text-xs text-muted-foreground">{t('revokedSessions', { count: revoked })}</span>
          ) : null}
        </div>

        {errorKey ? <FieldError>{errors(errorKey)}</FieldError> : null}
      </div>

      {bans.length === 0 ? (
        <p className="border-t border-border px-5 py-6 text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-medium">{t('ipLabel')}</th>
                <th className="px-5 py-2 font-medium">{t('reason')}</th>
                <th className="px-5 py-2 font-medium">{t('blockedBy')}</th>
                <th className="px-5 py-2 font-medium">{t('blockedAt')}</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {bans.map((ban) => (
                <tr key={ban.id}>
                  <td className="px-5 py-2 font-medium break-all tabular-nums">{ban.ip}</td>
                  <td className="px-5 py-2 text-muted-foreground">{ban.reason}</td>
                  <td className="px-5 py-2 break-all text-muted-foreground">{ban.bannedBy}</td>
                  <td className="px-5 py-2 text-muted-foreground">{ban.blockedAt}</td>
                  <td className="px-5 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={removing !== null}
                      onClick={() => void remove(ban.id)}
                    >
                      {removing === ban.id ? (
                        <Loader2 className="animate-spin" aria-hidden />
                      ) : (
                        <ShieldOff aria-hidden />
                      )}
                      {t('remove')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  )
}
