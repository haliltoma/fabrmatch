import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  AttributeType,
  ProductStatus,
  type CreateOfferDTO,
  type CreateProductDTO,
} from "@mercurjs/types";
import {
  approveSellerWorkflow,
  createOffersWorkflow,
  createProductAttributesWorkflow,
  createProductsWorkflow,
  createSellerAccountWorkflow,
  createSellerShippingOptionsWorkflow,
  createSellerStockLocationsWorkflow,
} from "@mercurjs/core/workflows";
import {
  createApiKeysWorkflow,
  createLocationFulfillmentSetWorkflow,
  createProductCategoriesWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingProfilesWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Fabrmatch demo verisi (yerel geliştirme). Mercur şablonundaki ayakkabı kataloğunun
 * yerine 3D baskı ürünleri: siparişe göre üretilir, stok sanal, üretimi Sistem B yapar.
 * Baskı profili (06-PRD-TASARIM-SISTEMI malzeme çubuğu) product.metadata.print_profile'da.
 */

const SLICER = "fabrmatch-mesh-estimator/1.0";
const SALES_CHANNEL_NAME = "Fabrmatch storefront";
const SELLER_PASSWORD = "supersecret"; // yalnızca yerel demo hesapları

const REGIONS = [
  { name: "Türkiye", currency_code: "try", countries: ["tr"] },
  { name: "Europe", currency_code: "eur", countries: ["de", "fr", "nl", "it", "es"] },
];
const ALL_COUNTRIES = REGIONS.flatMap((region) => region.countries);

// Kök kategori → alt kategoriler. Türkçe karakterli adlar için handle'lar açıkça verilir.
const CATEGORY_TREE: { name: string; handle: string; children: { name: string; handle: string }[] }[] = [
  {
    name: "Ev ve dekorasyon",
    handle: "ev-ve-dekorasyon",
    children: [
      { name: "Saksılar", handle: "saksilar" },
      { name: "Aydınlatma", handle: "aydinlatma" },
      { name: "Duvar dekoru", handle: "duvar-dekoru" },
    ],
  },
  {
    name: "Masa üstü düzen",
    handle: "masa-ustu-duzen",
    children: [
      { name: "Organizerler", handle: "organizerler" },
      { name: "Telefon standları", handle: "telefon-standlari" },
    ],
  },
  {
    name: "Oyun ve hobi",
    handle: "oyun-ve-hobi",
    children: [
      { name: "Masa oyunu parçaları", handle: "masa-oyunu-parcalari" },
      { name: "Zar kuleleri", handle: "zar-kuleleri" },
    ],
  },
  {
    name: "Yedek parça",
    handle: "yedek-parca",
    children: [{ name: "Mutfak", handle: "mutfak" }],
  },
];

const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU"];
const COLORS = ["Siyah", "Beyaz", "Gri", "Yeşil", "Bal"];

type CatalogItem = {
  title: string;
  handle: string;
  category: string; // alt kategori handle'ı
  price_try: number;
  materials: string[];
  colors: string[];
  description: string;
  print: { part_weight_g: number; support_weight_g: number; print_time_minutes: number };
};

const CATALOG: CatalogItem[] = [
  {
    title: "Geometrik saksı, orta boy",
    handle: "geometrik-saksi-orta",
    category: "saksilar",
    price_try: 450,
    materials: ["PLA", "PETG"],
    colors: ["Beyaz", "Yeşil"],
    description: "Drenaj delikli, 12 cm çaplı low-poly saksı.",
    print: { part_weight_g: 142, support_weight_g: 6, print_time_minutes: 310 },
  },
  {
    title: "Parametrik masa lambası gövdesi",
    handle: "parametrik-masa-lambasi",
    category: "aydinlatma",
    price_try: 890,
    materials: ["PETG"],
    colors: ["Beyaz", "Siyah"],
    description: "E14 duy uyumlu, spiral desenli lamba gövdesi. Elektrik aksamı dahil değildir.",
    print: { part_weight_g: 260, support_weight_g: 18, print_time_minutes: 540 },
  },
  {
    title: "Petek duvar rafı",
    handle: "petek-duvar-rafi",
    category: "duvar-dekoru",
    price_try: 620,
    materials: ["PLA"],
    colors: ["Siyah", "Bal"],
    description: "Birbirine geçmeli altıgen modüller, gizli vida yuvası.",
    print: { part_weight_g: 190, support_weight_g: 0, print_time_minutes: 360 },
  },
  {
    title: "Modüler çekmece organizeri",
    handle: "moduler-cekmece-organizeri",
    category: "organizerler",
    price_try: 280,
    materials: ["PLA", "PETG"],
    colors: ["Gri", "Siyah"],
    description: "Standart çekmecelere uyan 4 bölmeli organizer.",
    print: { part_weight_g: 96, support_weight_g: 0, print_time_minutes: 170 },
  },
  {
    title: "Ayarlanabilir telefon standı",
    handle: "ayarlanabilir-telefon-standi",
    category: "telefon-standlari",
    price_try: 190,
    materials: ["PLA"],
    colors: ["Siyah", "Beyaz", "Yeşil"],
    description: "Üç açı kademeli, şarj kablosu kanallı stand.",
    print: { part_weight_g: 48, support_weight_g: 4, print_time_minutes: 95 },
  },
  {
    title: "Zar kulesi, kale",
    handle: "zar-kulesi-kale",
    category: "zar-kuleleri",
    price_try: 520,
    materials: ["PLA"],
    colors: ["Gri", "Bal"],
    description: "İç rampalı, zar tepsili kale temalı zar kulesi.",
    print: { part_weight_g: 175, support_weight_g: 22, print_time_minutes: 420 },
  },
  {
    title: "Masa oyunu kart tutucu seti",
    handle: "kart-tutucu-seti",
    category: "masa-oyunu-parcalari",
    price_try: 240,
    materials: ["PLA"],
    colors: ["Siyah", "Yeşil"],
    description: "Standart ve mini kart boyutları için 4'lü tutucu.",
    print: { part_weight_g: 70, support_weight_g: 0, print_time_minutes: 150 },
  },
  {
    title: "Bulaşık makinesi sepet tekerleği, 4'lü",
    handle: "bulasik-makinesi-sepet-tekerlegi",
    category: "mutfak",
    price_try: 160,
    materials: ["PETG"],
    colors: ["Beyaz", "Gri"],
    description: "Yaygın alt sepet raylarına uyan ısıya dayanıklı yedek tekerlek.",
    print: { part_weight_g: 22, support_weight_g: 2, print_time_minutes: 55 },
  },
];

const SELLERS = [
  {
    name: "Atölye Mersin",
    email: "seller@fabrmatch.dev",
    first_name: "Deniz",
    last_name: "Atölye",
    city: "Mersin",
    address_1: "Mezitli Mah. 1",
    catalog: [0, 1, 2, 3, 4],
    price_factor: 1,
  },
  {
    name: "Parametrik Tasarım",
    email: "studio@fabrmatch.dev",
    first_name: "Ece",
    last_name: "Parametrik",
    city: "İstanbul",
    address_1: "Moda Cad. 12",
    catalog: [3, 4, 5, 6, 7],
    price_factor: 1.05,
  },
];

const convert = (tryAmount: number) => ({
  eur: Math.max(1, Math.round(tryAmount / 36)),
  usd: Math.max(1, Math.round(tryAmount / 33)),
});

export default async function seedFabrmatchData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);
  const regionModuleService = container.resolve(Modules.REGION);
  const taxModuleService = container.resolve(Modules.TAX);
  const productModule = container.resolve(Modules.PRODUCT);
  const authModuleService = container.resolve(Modules.AUTH);

  logger.info("Seeding Fabrmatch store...");
  const [store] = await storeModuleService.listStores();

  let [salesChannel] = await salesChannelModuleService.listSalesChannels({ name: SALES_CHANNEL_NAME });
  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: SALES_CHANNEL_NAME }] },
    });
    salesChannel = result[0];
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "Fabrmatch",
        default_sales_channel_id: salesChannel.id,
        supported_currencies: [
          { currency_code: "try", is_default: true },
          { currency_code: "eur" },
          { currency_code: "usd" },
        ],
      },
    },
  });

  logger.info("Seeding regions and tax regions...");
  const existingRegions = await regionModuleService.listRegions({ name: { $in: REGIONS.map((r) => r.name) } });
  const missingRegions = REGIONS.filter((r) => !existingRegions.some((e) => e.name === r.name));
  if (missingRegions.length) {
    await createRegionsWorkflow(container).run({
      input: {
        regions: missingRegions.map((region) => ({ ...region, payment_providers: ["pp_system_default"] })),
      },
    });
  }
  const regions = await regionModuleService.listRegions({ name: { $in: REGIONS.map((r) => r.name) } });

  const existingTaxCountries = new Set((await taxModuleService.listTaxRegions()).map((tr) => tr.country_code));
  const missingTaxCountries = ALL_COUNTRIES.filter((c) => !existingTaxCountries.has(c));
  if (missingTaxCountries.length) {
    await createTaxRegionsWorkflow(container).run({
      input: missingTaxCountries.map((country_code) => ({ country_code, provider_id: "tp_system" })),
    });
  }

  logger.info("Seeding publishable API key...");
  const { data: apiKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token"],
    // Kendi anahtarımız: vitrin anahtarı TEK satış kanalına bağlı olmalı (sepet/stok sorguları bunu ister)
    filters: { type: "publishable", title: SALES_CHANNEL_NAME },
  });
  let publishableKey: { id: string; token: string } | undefined = apiKeys[0];
  if (!publishableKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: SALES_CHANNEL_NAME, type: "publishable", created_by: "" }] },
    });
    publishableKey = result[0];
  }
  try {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableKey.id, add: [salesChannel.id] },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already"))) {
      throw error;
    }
  }

  logger.info("Seeding product categories...");
  const allCategoryHandles = CATEGORY_TREE.flatMap((c) => [c.handle, ...c.children.map((child) => child.handle)]);
  const existingCategories = await productModule.listProductCategories({ handle: allCategoryHandles });
  const categoryByHandle = new Map(existingCategories.map((c) => [c.handle, c]));

  const missingRoots = CATEGORY_TREE.filter((c) => !categoryByHandle.has(c.handle));
  if (missingRoots.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingRoots.map((c) => ({
          name: c.name,
          handle: c.handle,
          is_active: true,
          rank: CATEGORY_TREE.indexOf(c),
        })),
      },
    });
    result.forEach((c) => categoryByHandle.set(c.handle, c));
  }
  const missingChildren = CATEGORY_TREE.flatMap((root) =>
    root.children
      .filter((child) => !categoryByHandle.has(child.handle))
      .map((child) => ({
        name: child.name,
        handle: child.handle,
        is_active: true,
        rank: root.children.indexOf(child),
        parent_category_id: categoryByHandle.get(root.handle)!.id,
      }))
  );
  if (missingChildren.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: missingChildren },
    });
    result.forEach((c) => categoryByHandle.set(c.handle, c));
  }

  logger.info("Seeding product attributes...");
  const ATTRIBUTE_DEFS = [
    { name: "Malzeme", handle: "material", values: MATERIALS },
    { name: "Renk", handle: "color", values: COLORS },
  ];
  type SeededAttribute = { id: string; handle: string; values: { id: string; name: string }[] };
  const loadAttributes = async () => {
    const { data } = await query.graph({
      entity: "product_attribute",
      fields: ["id", "handle", "values.id", "values.name"],
      filters: { handle: ATTRIBUTE_DEFS.map((a) => a.handle), product_id: null },
    });
    return new Map((data as SeededAttribute[]).map((a) => [a.handle, a]));
  };
  let attributeByHandle = await loadAttributes();
  const missingAttributes = ATTRIBUTE_DEFS.filter((a) => !attributeByHandle.has(a.handle));
  if (missingAttributes.length) {
    await createProductAttributesWorkflow(container).run({
      input: {
        attributes: missingAttributes.map((attr) => ({
          name: attr.name,
          handle: attr.handle,
          type: AttributeType.MULTI_SELECT,
          is_variant_axis: true,
          is_filterable: true,
          rank: ATTRIBUTE_DEFS.indexOf(attr),
          values: attr.values.map((name, rank) => ({ name, rank })),
        })),
      },
    });
    attributeByHandle = await loadAttributes();
  }
  const materialAttribute = attributeByHandle.get("material")!;
  const colorAttribute = attributeByHandle.get("color")!;
  const valueIds = (attribute: SeededAttribute, names: string[]) =>
    names
      .map((name) => attribute.values.find((v) => v.name === name)?.id)
      .filter((id): id is string => Boolean(id));

  const { data: existingSellers } = await query.graph({
    entity: "seller",
    fields: ["id"],
    filters: { email: SELLERS[0].email },
  });
  if (existingSellers[0]) {
    logger.info("Demo sellers already exist, skipping seller, product and offer seeding.");
    return;
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    filters: { name: "Marketplace Shipping" },
  });
  let shippingProfileId = shippingProfiles[0]?.id as string | undefined;
  if (!shippingProfileId) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Marketplace Shipping", type: "default" }] },
    });
    shippingProfileId = result[0].id;
  }

  const seededSellers: { id: string; memberId: string; stockLocationId: string }[] = [];

  for (const [index, config] of SELLERS.entries()) {
    logger.info(`Seeding seller "${config.name}"...`);

    const registration = await authModuleService.register("emailpass", {
      body: { email: config.email, password: SELLER_PASSWORD },
    });
    let authIdentityId = registration.authIdentity?.id;
    if (!registration.success || !authIdentityId) {
      const [providerIdentity] = await authModuleService.listProviderIdentities({
        entity_id: config.email,
        provider: "emailpass",
      });
      authIdentityId = providerIdentity.auth_identity_id!;
    }

    const { result: seller } = await createSellerAccountWorkflow(container).run({
      input: {
        auth_identity_id: authIdentityId,
        member_email: config.email,
        first_name: config.first_name,
        last_name: config.last_name,
        seller: {
          name: config.name,
          email: config.email,
          currency_code: "try",
          description: `${config.name}: Fabrmatch demo satıcısı.`,
        },
      },
    });
    await approveSellerWorkflow(container).run({ input: { seller_id: seller.id } });

    const { data: members } = await query.graph({
      entity: "member",
      fields: ["id"],
      filters: { email: config.email },
    });

    const { result: stockLocations } = await createSellerStockLocationsWorkflow(container).run({
      input: {
        seller_id: seller.id,
        locations: [
          {
            name: `${config.name} (üretim ağı)`,
            address: { city: config.city, country_code: "TR", address_1: config.address_1 },
          },
        ],
      },
    });
    const stockLocation = stockLocations[0];

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    });
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [salesChannel.id] },
    });
    if (index === 0) {
      await updateStoresWorkflow(container).run({
        input: { selector: { id: store.id }, update: { default_location_id: stockLocation.id } },
      });
    }

    await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: stockLocation.id,
        fulfillment_set_data: { name: `${config.name} delivery`, type: "shipping" },
      },
    });
    const {
      data: [locationWithSet],
    } = await query.graph({
      entity: "stock_location",
      fields: ["id", "fulfillment_sets.id"],
      filters: { id: stockLocation.id },
    });
    const fulfillmentSetId = locationWithSet?.fulfillment_sets?.[0]?.id;
    if (!fulfillmentSetId) {
      throw new Error(`Fulfillment set was not created for seller "${config.name}"`);
    }

    const { result: serviceZones } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            fulfillment_set_id: fulfillmentSetId,
            name: `${config.name} delivery zone`,
            geo_zones: ALL_COUNTRIES.map((country_code) => ({ country_code, type: "country" as const })),
          },
        ],
      },
    });

    const regionPrices = (tryAmount: number) =>
      regions.map((region) => ({
        region_id: region.id,
        amount: region.currency_code === "try" ? tryAmount : convert(tryAmount).eur,
      }));

    await createSellerShippingOptionsWorkflow(container).run({
      input: {
        seller_id: seller.id,
        shipping_options: [
          {
            name: "Standart kargo",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: serviceZones[0].id,
            shipping_profile_id: shippingProfileId,
            type: { label: "Standart", description: "Üretim sonrası 2-3 günde teslim.", code: "standard" },
            prices: [
              { currency_code: "try", amount: 90 },
              { currency_code: "eur", amount: convert(90).eur },
              { currency_code: "usd", amount: convert(90).usd },
              ...regionPrices(90),
            ],
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
        ],
      },
    });

    seededSellers.push({ id: seller.id, memberId: members[0].id, stockLocationId: stockLocation.id });
  }

  logger.info("Seeding products...");
  const products: CreateProductDTO[] = CATALOG.map((item) => {
    const skuBase = item.handle.toUpperCase().replace(/-/g, "");
    return {
      title: item.title,
      handle: item.handle,
      description: item.description,
      category_ids: [categoryByHandle.get(item.category)!.id],
      status: ProductStatus.PUBLISHED,
      weight: item.print.part_weight_g,
      metadata: {
        made_to_order: true,
        design_reference: `design_${item.handle}`,
        print_profile: { slicer: SLICER, ...item.print },
      },
      attributes: [
        { id: materialAttribute.id, value_ids: valueIds(materialAttribute, item.materials) },
        { id: colorAttribute.id, value_ids: valueIds(colorAttribute, item.colors) },
      ],
      variants: item.materials.flatMap((material) =>
        item.colors.map((color) => ({
          title: `${material} / ${color}`,
          sku: `${skuBase}-${material}-${color.toUpperCase()}`,
          options: { Malzeme: material, Renk: color },
        }))
      ),
    };
  });

  await createProductsWorkflow(container).run({
    input: { created_by: seededSellers[0].memberId, products },
  });

  logger.info("Seeding offers...");
  const { data: seededProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.sku"],
    filters: { handle: CATALOG.map((item) => item.handle) },
  });
  const productByHandle = new Map(seededProducts.map((p) => [p.handle, p]));

  const offers: CreateOfferDTO[] = SELLERS.flatMap((config, sellerIndex) => {
    const seller = seededSellers[sellerIndex];
    return config.catalog.flatMap((catalogIndex) => {
      const item = CATALOG[catalogIndex];
      const product = productByHandle.get(item.handle)!;
      const priceTry = Math.round(item.price_try * config.price_factor);
      return (product.variants as { id: string; sku: string }[]).map((variant) => {
        const sku = `${variant.sku}-S${sellerIndex + 1}`;
        return {
          seller_id: seller.id,
          created_by: seller.memberId,
          sku,
          variant_id: variant.id,
          shipping_profile_id: shippingProfileId!,
          inventory_items: [
            {
              sku,
              // Siparişe göre üretim: stok sanal, kapasiteyi Sistem B yönetir
              stock_levels: [{ location_id: seller.stockLocationId, stocked_quantity: 1_000_000 }],
            },
          ],
          prices: [
            { amount: priceTry, currency_code: "try" },
            { amount: convert(priceTry).eur, currency_code: "eur" },
            { amount: convert(priceTry).usd, currency_code: "usd" },
          ],
        };
      });
    });
  });

  await createOffersWorkflow(container).run({ input: { offers } });
  logger.info(
    `Finished seeding Fabrmatch: ${products.length} products, ${offers.length} offers, ${SELLERS.length} sellers. Publishable key: ${publishableKey.token}`
  );
}
