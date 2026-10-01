import { makerNav } from '~/lib/nav'
import { PayeePayout, type PayeePayoutProps } from '~/components/payee_payout'

export default function MakerPayout(props: PayeePayoutProps) {
  return <PayeePayout {...props} />
}

MakerPayout.layout = 'dashboard'
MakerPayout.dashboardProps = { navItems: makerNav, title: 'Maker' }
