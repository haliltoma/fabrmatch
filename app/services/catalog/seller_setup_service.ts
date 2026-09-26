import ModelFile from '#models/model_file'
import Order from '#models/order'
import SellerProduct from '#models/seller_product'
import type SellerProfile from '#models/seller_profile'
import type { MakerSetup as Setup } from '#services/manufacturing/maker_setup_service'

/**
 * A new seller's road to a first sale, value first: the profile is already done when they land here
 * (a head start keeps people going), then see a real price, put a product up, and hold a sample in
 * their hands before a customer does. Every step is read from data, so it ticks itself.
 */
export default class SellerSetupService {
  async forProfile(profile: SellerProfile): Promise<Setup> {
    const [file, product, sample] = await Promise.all([
      ModelFile.query().where('ownerId', profile.userId).select('id').first(),
      SellerProduct.query()
        .where('sellerProfileId', profile.id)
        .where('status', 'active')
        .select('id')
        .first(),
      Order.query()
        .where('buyerId', profile.userId)
        .where('channel', 'sample')
        .select('id')
        .first(),
    ])

    const steps = [
      {
        id: 'profile',
        title: 'Create your seller profile',
        detail: 'Done.',
        href: '/seller',
        done: true,
      },
      {
        id: 'quote',
        title: 'Upload a model and see its price',
        detail:
          'Your first price takes seconds. It shows what a print costs before you add a margin.',
        href: '/files',
        done: !!file,
      },
      {
        id: 'product',
        title: 'List your first product',
        detail:
          'Pick one from the catalog or use your own model, set your margin and it goes live.',
        href: '/seller/products',
        done: !!product,
      },
      {
        id: 'sample',
        title: 'Order a sample at cost',
        detail: 'Check the quality yourself before your first customer does.',
        href: '/seller/products',
        done: !!sample,
      },
    ]
    const doneCount = steps.filter((s) => s.done).length
    return { steps, doneCount, complete: doneCount === steps.length }
  }
}
