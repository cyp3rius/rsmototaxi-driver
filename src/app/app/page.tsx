import { AppShell } from '@/components/shell/AppShell'
import { DashboardScreen } from '@/components/screens/DashboardScreen'

export default function AppHomePage() {
  return (
    <AppShell>
      <DashboardScreen />
    </AppShell>
  )
}
