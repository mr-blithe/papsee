'use client'

import { useState } from 'react'
import { Loader2, ShieldBan } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PanelCard, PanelCardHeader } from '@/components/panel/panel-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { useRouter } from '@/i18n/navigation'
import { AdminApiError, blockIpAddress } from '@/lib/admin/client'
import { apiErrorKey, type ApiErrorMessageKey } from '@/lib/api'

export interface AdminSessionView {
  id: string
  startedAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  impersonated: boolean
}

export function AdminSessionTable({ sessions }: { sessions: AdminSessionView[] }) {
  const t = useTranslations('AdminUsers')
  const errors = useTranslations('ApiErrors')
  const router = useRouter()

  const [blocking, setBlocking] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<ApiErrorMessageKey | null>(null)

  const block = async (ip: string) => {
    setBlocking(ip)
    setErrorKey(null)

    try {
      await blockIpAddress(ip, null)
      router.refresh()
    } catch (error) {
      setErrorKey(apiErrorKey(error instanceof AdminApiError ? error.code : undefined))
    } finally {
      setBlocking(null)
    }
  }

  return (
    <PanelCard>
      <PanelCardHeader title={t('sessionsTitle')} description={t('sessionsDescription')} />

      {sessions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">{t('noSessions')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-medium">{t('sessionStarted')}</th>
                <th className="px-5 py-2 font-medium">{t('sessionExpires')}</th>
                <th className="px-5 py-2 font-medium">{t('sessionIp')}</th>
                <th className="px-5 py-2 font-medium">{t('sessionDevice')}</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sessions.map((row) => (
                <tr key={row.id} className="tabular-nums">
                  <td className="px-5 py-2">
                    {row.startedAt}
                    {row.impersonated ? (
                      <Badge variant="secondary" className="ml-2 align-middle">
                        {t('sessionImpersonated')}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-5 py-2 text-muted-foreground">{row.expiresAt}</td>
                  <td className="px-5 py-2 break-all">{row.ipAddress}</td>
                  <td className="max-w-xs truncate px-5 py-2 text-muted-foreground">{row.userAgent}</td>
                  <td className="px-5 py-2 text-right">
                    {row.ipAddress ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={blocking !== null}
                        onClick={() => void block(row.ipAddress ?? '')}
                      >
                        {blocking === row.ipAddress ? (
                          <Loader2 className="animate-spin" aria-hidden />
                        ) : (
                          <ShieldBan aria-hidden />
                        )}
                        {t('banThisIp')}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {errorKey ? (
        <div className="px-5 pb-4">
          <FieldError>{errors(errorKey)}</FieldError>
        </div>
      ) : null}
    </PanelCard>
  )
}
