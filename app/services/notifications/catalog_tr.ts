import {
  money,
  orderLink,
  type NotificationType,
  type Template,
} from '#services/notifications/catalog'

const DECISIONS: Record<string, string> = {
  full_refund: 'tam iade',
  partial_refund: 'kısmi iade',
  release: 'ödemenin serbest bırakılması',
  reproduce: 'yeniden üretim',
  resolved: 'çözüldü',
}

/** Turkish twin of TEMPLATES: same recipients, same facts, nothing more. */
export const TEMPLATES_TR: Record<NotificationType, Template> = {
  welcome: (role, c) =>
    role === 'buyer' || role === 'seller'
      ? {
          title: "Fabrmatch'e hoş geldin",
          body: 'E-postanı doğrula, sonra fiyat görmek için bir model yükle ya da katalogdan bir ürün listele. Ödemelerin teslimata kadar her zaman bekletilir.',
          link: c.orderId ? `/orders/${c.orderId}` : '/files',
        }
      : null,

  payment_reminder: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} için ödemeyi tamamla`,
          body: 'Siparişin ödeme bekliyor. Ödenene kadar hiçbir şey basılmaz ve paran teslimi onaylayana dek bekletilir.',
          link: orderLink.buyer(c),
        }
      : null,

  review_request: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} nasıl oldu?`,
          body: 'Teslimi onayla ve baskıyı puanla. Bir dakikanı alır, sonraki alıcıya yardımcı olur. Bir sorun varsa sipariş sayfasından itiraz aç.',
          link: orderLink.buyer(c),
        }
      : null,

  capacity_idle: (role) =>
    role === 'maker'
      ? {
          title: 'Yazıcılarında listelenmiş boş saat yok',
          body: 'Teklifler, yalnızca bir yazıcının önümüzdeki hafta boş kapasitesi varsa sana ulaşır. Kapasite takvimini aç ve saat ekle.',
          link: '/maker/capacity',
        }
      : null,

  rfq_invited: (role, c) =>
    role === 'maker'
      ? {
          title: 'Teklif vermeye davetlisin',
          body: `Bir alıcı ${c.rfqCode} için teklif istiyor. Dikkate alınmak için son tarihten önce teklif ver.`,
          link: `/maker/rfqs/${c.rfqId}`,
        }
      : null,

  rfq_bid_received: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.rfqCode} için yeni teklif`,
          body: 'Bir üretici teklif gönderdi. Tüm teklifleri karşılaştır ve hazır olduğunda birini seç.',
          link: `/rfqs/${c.rfqId}`,
        }
      : null,

  rfq_awarded: (role, c) =>
    role === 'maker'
      ? {
          title: `${c.rfqCode} için teklifin seçildi`,
          body: 'Alıcı şimdi ödeme yapacak. Ardından kabul edip başlatman için iş sana gelir.',
          link: `/maker/rfqs/${c.rfqId}`,
        }
      : null,

  revision_requested: (role, c) =>
    role === 'buyer'
      ? {
          title: `Üreticinin ${c.code} hakkında bir sorusu var`,
          body: 'Üretici kabul etmeden önce bir değişiklik ya da ayrıntı istedi. Sipariş sayfasından cevap ver; yeniden ödeme alınmaz.',
          link: orderLink.buyer(c),
        }
      : null,

  revision_answered: (role, c) =>
    role === 'maker'
      ? {
          title: 'Alıcı sorunu cevapladı',
          body: 'Sorduğun teklif yeniden panonda. Süresi dolmadan kabul et ya da reddet.',
          link: orderLink.maker(c),
        }
      : null,

  message_received: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} hakkında yeni mesaj`,
          body: 'Üreticin bu sipariş hakkında sana yazdı.',
          link: `/orders/${c.orderId}/messages`,
        }
      : role === 'maker'
        ? {
            title: `${c.code} hakkında yeni mesaj`,
            body: 'Alıcı bu iş hakkında sana yazdı.',
            link: `/maker/orders/${c.orderId}/messages`,
          }
        : null,

  payment_received: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} için ödeme alındı`,
          body: 'Ödemen güvenle bekletiliyor. Şimdi siparişin için en uygun üreticiyi arıyoruz.',
          link: orderLink.buyer(c),
        }
      : null,

  offer_received: (role, c) =>
    role === 'maker'
      ? {
          title: 'Yeni üretim teklifi',
          body: `Yazıcılarına ve malzemelerine uyan bir baskı işi bekliyor${
            c.alias ? `, ${c.alias}` : ''
          }. ${c.ttlMinutes ?? 30} dakika içinde sona erer, sonra sıradaki üreticiye gider.`,
          link: orderLink.maker(c),
        }
      : null,

  order_unmatched: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code}: hâlâ üretici arıyoruz`,
          body: 'Henüz hiçbir üretici siparişini alamadı. Ekibimiz ilgileniyor. Kimse kabul etmezse ödemen otomatik olarak tamamen iade edilir.',
          link: orderLink.buyer(c),
        }
      : null,

  order_in_production: (role, c) =>
    role === 'buyer' || role === 'seller'
      ? {
          title: `${c.code} üretimde`,
          body: 'Doğrulanmış bir üretici siparişini kabul etti ve basıyor.',
          link: orderLink[role](c),
        }
      : null,

  order_shipped: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} yolda`,
          body: c.trackingNumber
            ? `${c.carrier ?? 'Taşıyıcı'} ile gönderildi. Takip numarası: ${c.trackingNumber}.`
            : 'Siparişin gönderildi.',
          link: orderLink.buyer(c),
        }
      : role === 'seller'
        ? {
            title: `${c.code} gönderildi`,
            body: 'Sipariş alıcıya doğru yolda.',
            link: orderLink.seller(c),
          }
        : null,

  order_delivered: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} teslim edildi`,
          body: 'Parçalarını kontrol et. Onaylamak ya da sorun bildirmek için 7 günün var; sonrasında ödeme serbest bırakılır.',
          link: orderLink.buyer(c),
        }
      : role === 'maker'
        ? {
            title: `${c.code} teslim edildi`,
            body: 'Teslim onaylandı. Sipariş tamamlanınca ödemen yapılır.',
            link: orderLink.maker(c),
          }
        : null,

  order_completed: (role, c) =>
    role === 'maker' || role === 'seller'
      ? {
          title: `${c.code} tamamlandı`,
          body: 'Sipariş tamamlandı. Ödemen serbest bırakılıyor.',
          link: orderLink[role](c),
        }
      : null,

  order_cancelled: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} iptal edildi`,
          body: 'Sipariş iptal edildi. Yapılan ödeme tamamen iade edilir.',
          link: orderLink.buyer(c),
        }
      : null,

  refund_issued: (role, c) =>
    role === 'buyer'
      ? {
          title: `${money(c.amountMinor, c.currency)} iade gönderildi`,
          body: `${c.code} iadesi özgün ödeme yöntemine gönderildi. Bankanın göstermesi birkaç gün sürebilir.`,
          link: orderLink.buyer(c),
        }
      : null,

  payout_paid: (role, c) =>
    role === 'maker' || role === 'seller'
      ? {
          title: `${money(c.amountMinor, c.currency)} ödeme yapıldı`,
          body: `${c.code} için ödemen serbest bırakıldı.`,
          link: orderLink[role](c),
        }
      : null,

  payout_action: (role, c) => {
    if (role !== 'maker' && role !== 'seller') return null
    const link = c.payoutLink ?? (role === 'maker' ? '/maker/payout' : '/seller/payout')
    switch (c.step) {
      case 'profile_approved':
        return {
          title: 'Ödeme bilgilerin onaylandı',
          body: 'Ödemelerin artık serbest bırakılabilir.',
          link,
        }
      case 'profile_rejected':
        return {
          title: 'Ödeme bilgilerinde düzeltme gerekiyor',
          body: `Vergi ve banka bilgilerin onaylanamadı: ${c.reason ?? ''}`.trim(),
          link,
        }
      case 'invoice_needed':
        return {
          title: `${c.code} için Fabrmatch'e fatura kes`,
          body: `Ödemeni almak için ${money(c.amountMinor, c.currency)} tutarındaki faturanı yükle.`,
          link,
        }
      case 'invoice_rejected':
        return {
          title: `${c.code} faturası kabul edilmedi`,
          body: `${c.reason ?? ''} Düzeltilmiş faturayı yükle.`.trim(),
          link,
        }
      case 'invoice_approved':
        return {
          title: `${c.code} faturası onaylandı`,
          body: 'Ödemen bir sonraki banka havalesine eklendi.',
          link,
        }
      default:
        return { title: 'Ödeme güncellemesi', body: 'Ayrıntılar için ödemeler sayfanı aç.', link }
    }
  },

  store_order: (role, c) => {
    if (role !== 'seller') return null
    const shopOrder = c.shopOrder ?? 'Bir sipariş'
    const toOrder = c.orderId ? `/orders/${c.orderId}` : '/seller/stores'
    switch (c.storeStep) {
      case 'needs_payment':
        return {
          title: `Mağazandan gelen ${shopOrder} ödeme bekliyor`,
          body: `${c.code} için ${money(c.amountMinor, c.currency)} öde, baskıya başlayalım. Cüzdanında yeterli bakiye olursa bu kendiliğinden olur.`,
          link: toOrder,
        }
      case 'paid_from_wallet':
        return {
          title: `Mağazandan gelen ${shopOrder} ödendi, üreticiye gidiyor`,
          body: `${c.code} için ${money(c.amountMinor, c.currency)} bakiyenden düşüldü.`,
          link: toOrder,
        }
      case 'needs_mapping':
        return {
          title: `${shopOrder} için ürün eşlemesi gerekiyor`,
          body: 'Ürünü kendi ürünlerinden birine bağla, sipariş kendiliğinden oluşsun.',
          link: '/seller/stores',
        }
      case 'failed':
        return {
          title: `${shopOrder} oluşturulamadı`,
          body: c.reason ?? 'Ayrıntılar için mağazalar sayfasını aç.',
          link: '/seller/stores',
        }
      case 'cancelled':
        return {
          title: `${shopOrder} mağazanda iptal edildi`,
          body: `${c.code ?? 'Siparişi'} biz de iptal ettik; ödediğin tutar iade edilir.`,
          link: toOrder,
        }
      case 'price_loss':
        return {
          title: `${c.productTitle ?? 'Bir ürün'} artık ${shopOrder} mağazasında maliyetin altında satılıyor`,
          body: `Üretim artık mağaza fiyatından pahalı. Fiyatı yaklaşık ${money(c.amountMinor, c.currency)} yap ya da fiyatlarını bizim güncel tutmamıza izin ver.`,
          link: '/seller/stores',
        }
      case 'price_thin':
        return {
          title: `${shopOrder} mağazasında ${c.productTitle ?? 'bir üründeki'} marjın daraldı`,
          body: `Üretim maliyeti arttı. Marjını koruyan fiyat yaklaşık ${money(c.amountMinor, c.currency)}.`,
          link: '/seller/stores',
        }
      case 'price_updated':
        return {
          title: `${shopOrder} mağazasında fiyatlar güncellendi`,
          body: `${c.productTitle ?? 'Bir ürün'}, istediğin gibi marjını koruyan yeni bir fiyat aldı.`,
          link: '/seller/stores',
        }
      case 'cancelled_in_shop':
        return {
          title: `${c.code ?? 'Sipariş'} iptal edildi; ${shopOrder} mağazasında da iptal ettik`,
          body: 'Hiçbir üretici zamanında basamadı. Müşterine mağazanda iade yapıldı, bize ödediğin tutar da iade ediliyor.',
          link: toOrder,
        }
      case 'refund_in_shop':
        return {
          title: `Lütfen ${c.code ?? 'siparişin'} iadesini ${shopOrder} mağazanda yap`,
          body: 'Hiçbir üretici zamanında basamadı. Siparişi mağazanda iptal ettik ve bize ödediğin tutarı iade ettik, ancak mağazan müşterine kendiliğinden iade yapmıyor: iadeyi orada yap.',
          link: toOrder,
        }
      case 'cancel_in_shop':
        return {
          title: `Lütfen ${c.code ?? 'siparişi'} ${shopOrder} mağazanda iptal et`,
          body: `Hiçbir üretici zamanında basamadı ve bize ödediğin tutarı iade ettik. ${c.reason ? `Mağazanda iptal edemedik (${c.reason}). ` : 'Mağazan bizim iptal etmemize izin vermiyor. '}Müşterin için orada iptal edip iade et.`,
          link: toOrder,
        }
      case 'waiting_for_maker':
        return {
          title: `${shopOrder} mağazasından gelen ${c.code ?? 'sipariş'} hâlâ üretici bekliyor`,
          body: 'Basacak birini arıyoruz. Müşterin sorarsa üretime hazırlandığını söyleyebilirsin.',
          link: toOrder,
        }
      case 'cancel_too_late':
        return {
          title: `${shopOrder} iptal edildi ama baskı başladı`,
          body: `${c.code ?? 'Sipariş'} üretimde; yine de müşterine gönderilecek.`,
          link: toOrder,
        }
      default:
        return {
          title: `${shopOrder} güncellendi`,
          body: 'Ayrıntılar için mağazalar sayfasını aç.',
          link: '/seller/stores',
        }
    }
  },

  dispute_opened: (role, c) =>
    role === 'maker'
      ? {
          title: `${c.code} için itiraz açıldı`,
          body: 'Alıcı bir sorun bildirdi. Ödeme bekletiliyor. Lütfen yanıtını ekle.',
          link: orderLink.maker(c),
        }
      : role === 'seller'
        ? {
            title: `${c.code} için itiraz açıldı`,
            body: 'Bu sipariş için bir sorun bildirildi. Ödeme çözülene dek bekletiliyor.',
            link: orderLink.seller(c),
          }
        : role === 'admin'
          ? {
              title: `${c.code} için yeni itiraz`,
              body: 'Bir alıcı itiraz açtı. Karar gerekiyor.',
              link: orderLink.admin(c),
            }
          : null,

  dispute_responded: (role, c) =>
    role === 'buyer'
      ? {
          title: `Üretici ${c.code} için yanıt verdi`,
          body: 'Yanıtı okumak ve gerekirse fotoğraf eklemek için siparişini aç.',
          link: orderLink.buyer(c),
        }
      : role === 'admin'
        ? {
            title: `${c.code} için yanıt geldi`,
            body: 'Üretici itiraza yanıt verdi. Karar için hazır.',
            link: orderLink.admin(c),
          }
        : null,

  dispute_resolved: (role, c) => {
    const decision =
      DECISIONS[c.resolution ?? 'resolved'] ?? (c.resolution ?? '').replaceAll('_', ' ')
    if (role === 'buyer') {
      return {
        title: `${c.code} itirazı çözüldü: ${decision}`,
        body:
          c.amountMinor && c.amountMinor > 0
            ? `${money(c.amountMinor, c.currency)} sana iade ediliyor.`
            : 'Karar bu sipariş için kesindir.',
        link: orderLink.buyer(c),
      }
    }
    if (role === 'maker' || role === 'seller') {
      return {
        title: `${c.code} itirazı çözüldü: ${decision}`,
        body: 'İtiraz kapandı. Ödeme karara göre yapılır.',
        link: orderLink[role](c),
      }
    }
    return null
  },
}
