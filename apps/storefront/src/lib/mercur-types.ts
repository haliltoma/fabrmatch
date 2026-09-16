/**
 * Mercur'a özgü tipler — `@medusajs/types` bunları içermez (Mercur'un kendi eklentileri).
 * Kaynak: apps/store/node_modules/@mercurjs/docs (references/api/store/*).
 */

export type PrintProfile = {
  slicer: string;
  part_weight_g: number;
  support_weight_g: number;
  print_time_minutes: number;
};

export type ProductMetadata = {
  made_to_order?: boolean;
  custom_design?: boolean;
  design_reference?: string;
  print_profile?: PrintProfile;
};

export type Money = {
  calculated_amount: number;
  original_amount: number;
  currency_code: string;
};

export type Offer = {
  id: string;
  seller_id: string;
  variant_id: string;
  product_id: string;
  sku: string | null;
  seller: { id: string; name: string; handle: string };
  calculated_price?: Money | null;
};

export type OrderGroup = {
  id: string;
  seller_count: number;
  total: number;
  created_at: string;
};
