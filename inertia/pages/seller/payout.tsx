import { sellerNav } from '~/lib/nav'
import { PayeePayout, type PayeePayoutProps } from '~/components/payee_payout'

export default function SellerPayout(props: PayeePayoutProps) {
  return <PayeePayout {...props} />
}

SellerPayout.layout = 'dashboard'
SellerPayout.dashboardProps = { navItems: sellerNav, title: 'Seller Panel' }
