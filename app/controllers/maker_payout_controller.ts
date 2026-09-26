import type { PayeeType } from '#services/payments/payee/payee_profile_service'
import SellerPayoutController from '#controllers/seller_payout_controller'

/** Maker door: /maker/payout. */
export default class MakerPayoutController extends SellerPayoutController {
  protected override payeeType: PayeeType = 'manufacturer'
  protected override basePath = '/maker/payout'
  protected override page = 'maker/payout' as const
}
