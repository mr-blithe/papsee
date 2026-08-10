import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// standalone traces the server and its dependencies into .next/standalone, which is what the
// container image copies instead of a full node_modules. Vercel packages the build itself and needs
// none of it, and asking for it there breaks the deploy: under Next 16.3 a standalone build stops
// writing .next/next-server.js.nft.json, which Vercel's onBuildComplete reads.
// https://github.com/vercel/next.js/issues/96646
const nextConfig: NextConfig = { output: process.env.VERCEL ? undefined : 'standalone' }

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
