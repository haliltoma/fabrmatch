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
