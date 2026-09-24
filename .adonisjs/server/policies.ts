export const policies = {
  AdminPolicy: () => import('#policies/admin_policy'),
  ManufacturerPolicy: () => import('#policies/manufacturer_policy'),
  SellerPolicy: () => import('#policies/seller_policy'),
}

