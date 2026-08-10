'use client'

import { useState } from 'react'
import { enUS, tr } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { calendarDayKey, DEVICE_TIME_ZONE, papDayDate } from '@/lib/pap/device-time'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface DateFieldProps {
  value: string | null
  onChange: (value: string | null) => void
  min?: string
  max?: string
  id?: string
  name?: string
  placeholder?: string
  className?: string
  triggerClassName?: string
}

export function DateField({
  value,
  onChange,
  min,
  max,
  id,
  name,
  placeholder,
  className,
  triggerClassName,
}: DateFieldProps) {
  const actions = useTranslations('Actions')
  const format = useFormatter()
  const locale = useLocale()
  const [open, setOpen] = useState(false)

  const selected = value ? papDayDate(value) : undefined
  const label = selected
    ? format.dateTime(selected, { day: 'numeric', month: 'long', year: 'numeric' })
    : (placeholder ?? actions('pickDate'))

  return (
    <div className={className}>
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className={cn(
                'h-8 w-full justify-start font-normal',
                !value && 'text-muted-foreground',
                triggerClassName,
              )}
            >
              <CalendarIcon aria-hidden />
              {label}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={locale === 'tr' ? tr : enUS}
            timeZone={DEVICE_TIME_ZONE}
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            startMonth={min ? papDayDate(min) : undefined}
            endMonth={max ? papDayDate(max) : undefined}
            disabled={[...(min ? [{ before: papDayDate(min) }] : []), ...(max ? [{ after: papDayDate(max) }] : [])]}
            onSelect={(picked) => {
              onChange(picked ? calendarDayKey(picked.getTime()) : null)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
