import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// standalone traces the server and its dependencies into .next/standalone, which is what the
// container image copies instead of a full node_modules. Vercel ignores it.
const nextConfig: NextConfig = { output: 'standalone' }

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
