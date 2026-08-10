'use client'

import { useState } from 'react'
import { ChevronDown, Download, Loader2, TriangleAlert, UserPen } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Link, useRouter } from '@/i18n/navigation'
import { apiErrorKey, type ApiErrorMessageKey } from '@/lib/api'
import { authErrorKey, type AuthErrorMessageKey } from '@/lib/auth-errors'
import { deleteUser } from '@/lib/auth-client'
import { deleteAllTherapyData, TherapyApiError } from '@/lib/therapy/client'
import { EXPORT_DOWNLOADS } from '@/lib/therapy/export'
import { PanelCard, PanelCardHeader } from './panel-card'
import { SharingCard } from './sharing-card'

const EXPORT_PATH = '/api/export'
const AFTER_DELETE_PATH = '/'

function matches(typed: string, word: string): boolean {
  return typed.trim().toLocaleLowerCase() === word.toLocaleLowerCase()
}

export function SettingsScreen({
  email,
  nights,
  hasPassword,
  shareLinks,
}: {
  email: string
  nights: number
  hasPassword: boolean
  shareLinks: { id: string; endsIn: string }[]
}) {
  const t = useTranslations('Settings')
  const actions = useTranslations('Actions')
  const errors = useTranslations('ApiErrors')
  const authErrors = useTranslations('Auth')
  const exportCopy = useTranslations('Export')
  const locale = useLocale()
  const router = useRouter()

  const [dataConfirmation, setDataConfirmation] = useState('')
  const [deletingData, setDeletingData] = useState(false)
  const [dataErrorKey, setDataErrorKey] = useState<ApiErrorMessageKey | null>(null)

  const [accountConfirmation, setAccountConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [accountErrorKey, setAccountErrorKey] = useState<AuthErrorMessageKey | null>(null)

  const dataWord = t('deleteConfirmWord')
  const accountWord = t('deleteAccountConfirmWord')
  const canDeleteData = matches(dataConfirmation, dataWord)
  const canDeleteAccount = matches(accountConfirmation, accountWord) && (!hasPassword || password.length > 0)

  const removeTherapyData = async () => {
    setDeletingData(true)
    setDataErrorKey(null)

    try {
      await deleteAllTherapyData()
      setDataConfirmation('')
      router.refresh()
      router.push('/panel/import')
    } catch (error) {
      setDataErrorKey(apiErrorKey(error instanceof TherapyApiError ? error.code : undefined))
      setDeletingData(false)
    }
  }

  const removeAccount = async () => {
    setDeletingAccount(true)
    setAccountErrorKey(null)

    const { error } = await deleteUser({
      callbackURL: AFTER_DELETE_PATH,
      ...(hasPassword ? { password } : {}),
    })

    if (error) {
      setAccountErrorKey(authErrorKey(error.code))
      setDeletingAccount(false)
      return
    }

    router.push(AFTER_DELETE_PATH)
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight">{t('accountTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('accountDescription', { email })}</p>
      </div>

      <PanelCard>
        <PanelCardHeader title={t('profileTitle')} description={t('profileDescription')} />
        <div className="px-5 py-4">
          <Button variant="outline" nativeButton={false} render={<Link href="/panel/onboarding" />}>
            <UserPen aria-hidden />
            {actions('editProfile')}
          </Button>
        </div>
      </PanelCard>

      <PanelCard>
        <PanelCardHeader title={t('exportTitle')} description={t('exportDescription')} />
        <div className="px-5 py-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline">
                  <Download aria-hidden />
                  {actions('exportData')}
                  <ChevronDown aria-hidden />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal text-muted-foreground">
                  {exportCopy('chooseFormat')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {EXPORT_DOWNLOADS.map((download) => (
                  <DropdownMenuItem
                    key={download.format}
                    render={
                      <a
                        href={`${EXPORT_PATH}?format=${download.format}&locale=${locale}`}
                        download={download.fileName}
                      />
                    }
                  >
                    {exportCopy(download.label)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="mt-2.5 text-xs text-muted-foreground">{t('exportNote')}</p>
        </div>
      </PanelCard>

      <SharingCard links={shareLinks} />

      <Collapsible>
        <PanelCard className="border-destructive/40">
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-xl px-5 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight text-destructive">{t('dangerTitle')}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t('dangerDescription')}</span>
            </span>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180"
              aria-hidden
            />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <section className="space-y-4 border-t border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-medium">{t('deleteTitle')}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('deleteDescription', { nights })}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t('deleteWarning')}</p>

              <Field className="sm:max-w-xs">
                <FieldLabel htmlFor="deleteDataConfirm">{t('deleteConfirmLabel', { word: dataWord })}</FieldLabel>
                <Input
                  id="deleteDataConfirm"
                  value={dataConfirmation}
                  autoComplete="off"
                  onChange={(event) => setDataConfirmation(event.target.value)}
                />
              </Field>

              {dataErrorKey ? <FieldError>{errors(dataErrorKey)}</FieldError> : null}

              <Button
                variant="destructive"
                disabled={!canDeleteData || deletingData}
                onClick={() => void removeTherapyData()}
              >
                {deletingData ? <Loader2 className="animate-spin" aria-hidden /> : <TriangleAlert aria-hidden />}
                {actions('deleteData')}
              </Button>
            </section>

            <section className="space-y-4 border-t border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-medium">{t('deleteAccountTitle')}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('deleteAccountDescription')}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t('deleteAccountWarning')}</p>

              {hasPassword ? (
                <Field className="sm:max-w-xs">
                  <FieldLabel htmlFor="deleteAccountPassword">{t('deleteAccountPasswordLabel')}</FieldLabel>
                  <Input
                    id="deleteAccountPassword"
                    type="password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
              ) : (
                <p className="text-xs text-muted-foreground">{t('deleteAccountFreshHint')}</p>
              )}

              <Field className="sm:max-w-xs">
                <FieldLabel htmlFor="deleteAccountConfirm">{t('deleteConfirmLabel', { word: accountWord })}</FieldLabel>
                <Input
                  id="deleteAccountConfirm"
                  value={accountConfirmation}
                  autoComplete="off"
                  onChange={(event) => setAccountConfirmation(event.target.value)}
                />
              </Field>

              {accountErrorKey ? <FieldError>{authErrors(accountErrorKey)}</FieldError> : null}

              <Button
                variant="destructive"
                disabled={!canDeleteAccount || deletingAccount}
                onClick={() => void removeAccount()}
              >
                {deletingAccount ? <Loader2 className="animate-spin" aria-hidden /> : <TriangleAlert aria-hidden />}
                {actions('deleteAccount')}
              </Button>
            </section>
          </CollapsibleContent>
        </PanelCard>
      </Collapsible>
    </div>
  )
}
