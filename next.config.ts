import type { NextConfig } from 'next'
import packageJson from './package.json'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    // Prefer explicit env (Vercel / .env.local); fall back to package.json version.
    NEXT_PUBLIC_APP_VERSION:
      process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version || 'dev',
  },
}

export default nextConfig
