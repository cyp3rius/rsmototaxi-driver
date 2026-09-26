import type { NextConfig } from 'next'
import packageJson from './package.json'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    // Always from package.json so a version bump busts SW / forces clients to refresh.
    // Do not override via Vercel env — bump `package.json` instead.
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
}

export default nextConfig
