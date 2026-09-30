import fabrmatchConfig from '#config/fabrmatch'
import { MAX_MODEL_BYTES, MAX_QUICK_BYTES } from '#services/files/file_scanner'

export type FaqCategory = 'ordering' | 'payment' | 'problems' | 'privacy' | 'selling' | 'making'

export interface FaqItem {
  category: FaqCategory
  q: string
  /** English source text; `{days}`-style placeholders are filled from `faqParams()`. */
  a: string
}

/**
 * The public questions and answers (home page, /help and their FAQPage JSON-LD). Every answer is
 * the product's actual rule; the numbers come from config through `faqParams()`, never hard-coded.
 * The first sentence answers the question on its own, so search and AI answers can quote it.
 */
export const FAQ: FaqItem[] = [
  {
    category: 'ordering',
    q: 'Do I need an account to see a price?',
    a: 'No. Drop an STL, 3MF or OBJ file on the instant price page and you see the delivered price straight away. You only sign up when you order.',
  },
  {
    category: 'ordering',
    q: 'Which files can I upload?',
    a: 'STL, 3MF and OBJ. The instant price takes files up to {quickMb} MB without an account; once signed in you can upload models up to {maxMb} MB.',
  },
  {
    category: 'ordering',
    q: 'How is the price calculated?',
    a: 'From the model’s volume, the material, print time and shipping to your address. The quote page shows the breakdown before you order.',
  },
  {
    category: 'ordering',
    q: 'How long does it take?',
    a: 'When a maker has free time for your job, the quote shows a delivery window: when printing can start, the production time and the carrier’s transit time. If no maker has room yet, the date is confirmed once one accepts.',
  },
  {
    category: 'ordering',
    q: 'Which materials can I choose?',
    a: 'The materials that verified makers print today, such as PLA and PETG. The materials page explains what each one is good for.',
  },
  {
    category: 'payment',
    q: 'When is my payment released to the maker?',
    a: 'Only after you have the part. Your payment is held while the part is made and delivered; after delivery you have {days} days to confirm or open a dispute. If you do nothing the order completes and the maker is paid. While a dispute is open nothing is paid out.',
  },
  {
    category: 'payment',
    q: 'Can I cancel an order?',
    a: 'Yes, with a full refund, until a maker accepts the job. Once production has started, open a dispute if there is a problem with the part.',
  },
  {
    category: 'problems',
    q: 'The part arrived damaged. What now?',
    a: 'Open a dispute from the order page within {days} days of delivery and add photos. We review both sides; the outcome can be a refund, a partial refund, a reprint by another maker, or release of the payment.',
  },
  {
    category: 'problems',
    q: 'What if no maker takes my order?',
    a: 'Our team looks for one by hand, and you can cancel for a full refund at any time. If nobody has accepted it after {unmatchedDays} days, the order is cancelled and refunded automatically.',
  },
  {
    category: 'problems',
    q: 'What if the maker cannot finish my part?',
    a: 'The job goes to another maker. Your payment stays on hold the whole time.',
  },
  {
    category: 'privacy',
    q: 'Is my model shared with anyone?',
    a: 'Only with the maker of your job, through a download link that expires. It is never shown publicly; the shop only shows a rendered picture.',
  },
  {
    category: 'privacy',
    q: 'Who prints my part?',
    a: 'A verified maker chosen for fit, quality and fairness. Buyers and makers stay anonymous to each other; you can message them on the order page and contact details are hidden.',
  },
  {
    category: 'privacy',
    q: 'Are uploaded files checked for viruses?',
    a: 'Every upload is scanned before anyone opens it: program files and known malware signatures, scripts hidden inside the model, broken geometry and zip bombs. A file that fails is blocked and can never be downloaded.',
  },
  {
    category: 'selling',
    q: 'Can I sell 3D printed products without a printer or stock?',
    a: 'Yes. Pick ready designs from the catalogue, set your margin and list them. Each order is printed and shipped by a verified maker after it is paid.',
  },
  {
    category: 'selling',
    q: 'When do sellers get their margin?',
    a: 'After the buyer confirms delivery, or when the {days}-day check window passes without a problem. Your buyers never see who printed the part.',
  },
  {
    category: 'making',
    q: 'How do I become a maker?',
    a: 'Join the maker list on the For makers page. We open city by city and approve every maker once before they receive offers.',
  },
  {
    category: 'making',
    q: 'How are jobs shared between makers?',
    a: 'Offers go to makers whose printer, material and free hours fit the job. Matching also sets aside a share of offers for new makers, so a new printer is not left waiting behind the busiest ones.',
  },
  {
    category: 'making',
    q: 'When are makers paid?',
    a: 'The buyer’s money is held from the start and released to you once delivery is confirmed or the check window passes without a dispute.',
  },
]

/** Numbers the answers mention, from the live configuration. */
export function faqParams() {
  return {
    days: fabrmatchConfig.orders.autoConfirmDays,
    unmatchedDays: fabrmatchConfig.orders.unmatchedAutoCancelDays,
    quickMb: Math.round(MAX_QUICK_BYTES / (1024 * 1024)),
    maxMb: Math.round(MAX_MODEL_BYTES / (1024 * 1024)),
  }
}
