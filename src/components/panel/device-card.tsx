'use client'

import { useTranslations } from 'next-intl'
import { formatProductName, type DeviceInfo } from '@/lib/pap'
import { DataList, PanelCard, PanelCardHeader } from './panel-card'

export function DeviceCard({ device }: { device: DeviceInfo | null }) {
  const t = useTranslations('Device')

  if (!device) return null

  return (
    <PanelCard>
      <PanelCardHeader title={t('title')} description={formatProductName(device.productName)} />
      <div className="px-5 py-4">
        <DataList
          wrap
          items={[
            { label: t('serialNumber'), value: device.serialNumber },
            { label: t('productCode'), value: device.productCode },
            { label: t('firmware'), value: device.applicationIdentifier },
            { label: t('bootloader'), value: device.bootloaderIdentifier },
            { label: t('dataModel'), value: device.dataVersion },
            { label: t('regions'), value: device.regions.join(', ') || '-' },
          ]}
        />
      </div>
    </PanelCard>
  )
}
