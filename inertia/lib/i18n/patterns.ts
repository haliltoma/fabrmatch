// Server messages that embed a value cannot be dictionary keys; match their shape instead.
export const trPatterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^"(.+)" is not in the colour catalogue$/, (m) => `"${m[1]}" renk kataloğunda yok`],
  [/^"(.+)" is not in the material catalogue$/, (m) => `"${m[1]}" malzeme kataloğunda yok`],
  [/^(.+) is not available for (\w+)$/, (m) => `${m[1]}, ${m[2]} için mevcut değil`],
  [/^A cart holds at most (\d+) lines$/, (m) => `Bir sepet en fazla ${m[1]} satır alabilir`],
  [/^At most (\d+) photos per job$/, (m) => `İş başına en fazla ${m[1]} fotoğraf`],
  [
    /^Bids can stay open for 1 to (\d+) days$/,
    (m) => `Teklifler 1 ile ${m[1]} gün arasında açık kalabilir`,
  ],
  [/^Category "(.+)" already exists$/, (m) => `"${m[1]}" kategorisi zaten var`],
  [/^Colour (.+) already exists$/, (m) => `${m[1]} rengi zaten var`],
  [/^Material (\S+) already exists$/, (m) => `${m[1]} malzemesi zaten var`],
  [/^Option (\S+) already exists$/, (m) => `${m[1]} seçeneği zaten var`],
  [/^Profile (\S+) already exists$/, (m) => `${m[1]} profili zaten var`],
  [
    /^Delivery must be within (\d+) days as requested$/,
    (m) => `Teslimat istendiği gibi ${m[1]} gün içinde olmalı`,
  ],
  [/^Finishing (\S+) is not available$/, (m) => `${m[1]} son işlemi mevcut değil`],
  [/^Keep it under (\d+) characters$/, (m) => `${m[1]} karakterin altında tut`],
  [
    /^Material (\S+) is not available for this product$/,
    (m) => `${m[1]} malzemesi bu ürün için mevcut değil`,
  ],
  [/^Unknown material: (.+)$/, (m) => `Bilinmeyen malzeme: ${m[1]}`],
  [/^Unsupported image type: (.+)$/, (m) => `Desteklenmeyen görüntü türü: ${m[1]}`],
  [/^(.+) already belongs to the (.+) region$/, (m) => `${m[1]} zaten ${m[2]} bölgesinde`],
  [
    /^The minimum order for delivery here is ([\d.]+) TRY$/,
    (m) => `Bu teslimat yeri için asgari sipariş ${m[1]} TRY`,
  ],
  [/^Payments in (\w+) are not available$/, (m) => `${m[1]} ile ödeme mevcut değil`],
  [/^Prices in (\w+) are not available$/, (m) => `${m[1]} cinsinden fiyatlar mevcut değil`],
  [
    /^Prices in (\w+) are unavailable right now\. Please try again later\.$/,
    (m) => `${m[1]} cinsinden fiyatlar şu an kullanılamıyor. Lütfen daha sonra tekrar dene.`,
  ],
  [/^Quantity must be between 1 and (\d+)$/, (m) => `Adet 1 ile ${m[1]} arasında olmalı`],
  [
    /^Tier must be a whole number from 0 to (\d+)$/,
    (m) => `Kademe 0 ile ${m[1]} arasında bir tam sayı olmalı`,
  ],
  [
    /^Unsupported file format: (.+)\. Allowed: STL, 3MF, OBJ$/,
    (m) => `Desteklenmeyen dosya biçimi: ${m[1]}. İzin verilenler: STL, 3MF, OBJ`,
  ],
  [
    /^File too large: (\d+) bytes \(max (\d+)\)$/,
    (m) => `Dosya çok büyük: ${m[1]} bayt (en fazla ${m[2]})`,
  ],
  [
    /^You can have at most (\d+) active API keys$/,
    (m) => `En fazla ${m[1]} aktif API anahtarın olabilir`,
  ],
  [
    /^You can have at most (\d+) webhook endpoints$/,
    (m) => `En fazla ${m[1]} webhook adresin olabilir`,
  ],
  [/^You can have at most (\d+) open requests$/, (m) => `En fazla ${m[1]} açık talebin olabilir`],
  [
    /^(.+) must be (a whole number|a number)$/,
    (m) => `${m[1]} ${m[2] === 'a number' ? 'bir sayı' : 'tam sayı'} olmalı`,
  ],
  [
    /^(.+) must be between ([\d.]+) and ([\d.]+)$/,
    (m) => `${m[1]}, ${m[2]} ile ${m[3]} arasında olmalı`,
  ],

  [
    /^The model is only ([\d.]+) mm thick in one direction — too thin to print\. Thicken it to at least ([\d.]+) mm\.$/,
    (m) =>
      `Model bir yönde yalnızca ${m[1]} mm kalınlığında — basılamayacak kadar ince. En az ${m[2]} mm'ye kalınlaştır.`,
  ],
  [
    /^One side is under ([\d.]+) mm \(([\d.]+) mm\)\. Thin parts may break or not print\.$/,
    (m) =>
      `Bir kenar ${m[1]} mm'nin altında (${m[2]} mm). İnce parçalar kırılabilir ya da basılmayabilir.`,
  ],
  [
    /^The whole model is under ([\d.]+) mm\. Check the units — was it exported in metres or inches\?$/,
    (m) =>
      `Modelin tamamı ${m[1]} mm'nin altında. Birimleri kontrol et — metre ya da inç olarak mı dışa aktarıldı?`,
  ],
  [
    /^About (\d+)% of the surface overhangs by more than 45°\. It will need supports, which adds print time and rough surfaces\.$/,
    (m) =>
      `Yüzeyin yaklaşık %${m[1]}'i 45°'den fazla çıkıntı yapıyor. Destek gerekir; bu baskı süresini uzatır ve yüzeyi pürüzlü yapar.`,
  ],
  [
    /^Printing it with its (\w+) axis pointing up would cut the overhang from about (\d+)% to (\d+)%, so it needs fewer supports\. Re-export the model in that orientation, or ask the maker to rotate it\.$/,
    (m) =>
      `${m[1]} ekseni yukarı bakacak şekilde basmak çıkıntıyı yaklaşık %${m[2]}'den %${m[3]}'e düşürür, böylece daha az destek gerekir. Modeli bu yönde yeniden dışa aktar ya da üreticiden döndürmesini iste.`,
  ],
  [
    /^(\d+) tiny loose fragments? not attached to the model\. Remove them or they may print as debris\.$/,
    (m) =>
      `Modele bağlı olmayan ${m[1]} küçük kopuk parça var. Kaldır, yoksa döküntü olarak basılabilir.`,
  ],
  [
    /^The file contains (\d+) separate parts; they print together on one plate\.$/,
    (m) => `Dosya ${m[1]} ayrı parça içeriyor; hepsi aynı plakada birlikte basılır.`,
  ],
  [/^Generated (\d+) slots from template\.$/, (m) => `Şablondan ${m[1]} slot üretildi.`],
  [
    /^Product set to (.+)\.$/,
    (m) =>
      `Ürün durumu: ${{ active: 'aktif', archived: 'arşivlendi', draft: 'taslak' }[m[1]] ?? m[1]}.`,
  ],
  [
    /^Welcome! Your invite gift code for a first order: (.+)$/,
    (m) => `Hoş geldin! İlk siparişin için davet hediye kodun: ${m[1]}`,
  ],
]
