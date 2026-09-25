import { AppShell } from '@/components/shell/AppShell'
import { ClientBoot } from '@/components/shell/ClientBoot'
import { DashboardScreen } from '@/components/screens/DashboardScreen'

export default function AppHomePage() {
  return (
    <AppShell>
      <ClientBoot>
        <DashboardScreen />
      </ClientBoot>
    </AppShell>
  )
}
