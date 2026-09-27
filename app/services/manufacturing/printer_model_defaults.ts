import type { PrinterTechnology } from '#models/printer'

/**
 * Curated worldwide printer catalogue (docs/notes.md): makers pick their machine instead of
 * typing specs by hand. Selection fills technology, build volume and the enclosed/open frame
 * fact (useful for material and finishing decisions later). Seeded by the create migration,
 * like materials and colours.
 */
export interface DefaultPrinterModel {
  brand: string
  model: string
  technology: PrinterTechnology
  build: [x: number, y: number, z: number]
  enclosed: boolean
}

export const DEFAULT_PRINTER_MODELS: DefaultPrinterModel[] = [
  // Bambu Lab
  {
    brand: 'Bambu Lab',
    model: 'A1 mini',
    technology: 'FDM',
    build: [180, 180, 180],
    enclosed: false,
  },
  { brand: 'Bambu Lab', model: 'A1', technology: 'FDM', build: [256, 256, 256], enclosed: false },
  { brand: 'Bambu Lab', model: 'P1P', technology: 'FDM', build: [256, 256, 256], enclosed: false },
  { brand: 'Bambu Lab', model: 'P1S', technology: 'FDM', build: [256, 256, 256], enclosed: true },
  {
    brand: 'Bambu Lab',
    model: 'X1 Carbon',
    technology: 'FDM',
    build: [256, 256, 256],
    enclosed: true,
  },
  { brand: 'Bambu Lab', model: 'X1E', technology: 'FDM', build: [256, 256, 256], enclosed: true },
  { brand: 'Bambu Lab', model: 'H2D', technology: 'FDM', build: [350, 320, 325], enclosed: true },
  // Prusa
  { brand: 'Prusa', model: 'MINI+', technology: 'FDM', build: [180, 180, 180], enclosed: false },
  { brand: 'Prusa', model: 'MK4S', technology: 'FDM', build: [250, 210, 220], enclosed: false },
  { brand: 'Prusa', model: 'MK4', technology: 'FDM', build: [250, 210, 220], enclosed: false },
  { brand: 'Prusa', model: 'XL', technology: 'FDM', build: [360, 360, 360], enclosed: false },
  { brand: 'Prusa', model: 'CORE One', technology: 'FDM', build: [250, 220, 270], enclosed: true },
  { brand: 'Prusa', model: 'SL1S Speed', technology: 'SLA', build: [128, 80, 150], enclosed: true },
  // Creality
  {
    brand: 'Creality',
    model: 'Ender 3 V2',
    technology: 'FDM',
    build: [220, 220, 250],
    enclosed: false,
  },
  {
    brand: 'Creality',
    model: 'Ender 3 V3 KE',
    technology: 'FDM',
    build: [220, 220, 240],
    enclosed: false,
  },
  {
    brand: 'Creality',
    model: 'Ender 3 S1',
    technology: 'FDM',
    build: [220, 220, 270],
    enclosed: false,
  },
  {
    brand: 'Creality',
    model: 'Ender 5 Plus',
    technology: 'FDM',
    build: [350, 350, 400],
    enclosed: false,
  },
  { brand: 'Creality', model: 'K1', technology: 'FDM', build: [220, 220, 250], enclosed: true },
  { brand: 'Creality', model: 'K1C', technology: 'FDM', build: [220, 220, 250], enclosed: true },
  { brand: 'Creality', model: 'K1 Max', technology: 'FDM', build: [300, 300, 300], enclosed: true },
  {
    brand: 'Creality',
    model: 'CR-10 Smart Pro',
    technology: 'FDM',
    build: [300, 300, 400],
    enclosed: false,
  },
  {
    brand: 'Creality',
    model: 'K2 Plus',
    technology: 'FDM',
    build: [350, 350, 350],
    enclosed: true,
  },
  {
    brand: 'Creality',
    model: 'Halot Mage Pro',
    technology: 'SLA',
    build: [228, 128, 230],
    enclosed: true,
  },
  // UltiMaker
  { brand: 'UltiMaker', model: 'S3', technology: 'FDM', build: [230, 190, 200], enclosed: true },
  { brand: 'UltiMaker', model: 'S5', technology: 'FDM', build: [330, 240, 300], enclosed: true },
  { brand: 'UltiMaker', model: 'S6', technology: 'FDM', build: [330, 240, 300], enclosed: true },
  { brand: 'UltiMaker', model: 'S7', technology: 'FDM', build: [330, 240, 300], enclosed: true },
  {
    brand: 'UltiMaker',
    model: 'Method X',
    technology: 'FDM',
    build: [190, 190, 196],
    enclosed: true,
  },
  {
    brand: 'UltiMaker',
    model: 'Ultimaker 2+',
    technology: 'FDM',
    build: [223, 223, 205],
    enclosed: false,
  },
  // Anycubic
  {
    brand: 'Anycubic',
    model: 'Kobra 2 Neo',
    technology: 'FDM',
    build: [220, 220, 250],
    enclosed: false,
  },
  {
    brand: 'Anycubic',
    model: 'Kobra 3',
    technology: 'FDM',
    build: [250, 250, 260],
    enclosed: false,
  },
  {
    brand: 'Anycubic',
    model: 'Kobra 2 Max',
    technology: 'FDM',
    build: [420, 420, 500],
    enclosed: false,
  },
  {
    brand: 'Anycubic',
    model: 'Photon Mono M5s',
    technology: 'SLA',
    build: [218, 123, 200],
    enclosed: true,
  },
  {
    brand: 'Anycubic',
    model: 'Photon Mono X 6Ks',
    technology: 'SLA',
    build: [195, 122, 200],
    enclosed: true,
  },
  // Elegoo
  {
    brand: 'Elegoo',
    model: 'Neptune 3 Pro',
    technology: 'FDM',
    build: [225, 225, 280],
    enclosed: false,
  },
  {
    brand: 'Elegoo',
    model: 'Neptune 4',
    technology: 'FDM',
    build: [225, 225, 265],
    enclosed: false,
  },
  {
    brand: 'Elegoo',
    model: 'Neptune 4 Pro',
    technology: 'FDM',
    build: [225, 225, 265],
    enclosed: false,
  },
  {
    brand: 'Elegoo',
    model: 'Neptune 4 Max',
    technology: 'FDM',
    build: [420, 420, 480],
    enclosed: false,
  },
  {
    brand: 'Elegoo',
    model: 'Mars 4 Ultra',
    technology: 'SLA',
    build: [153, 77, 165],
    enclosed: true,
  },
  { brand: 'Elegoo', model: 'Saturn 2', technology: 'SLA', build: [219, 123, 250], enclosed: true },
  {
    brand: 'Elegoo',
    model: 'Saturn 4 Ultra',
    technology: 'SLA',
    build: [218, 123, 220],
    enclosed: true,
  },
  {
    brand: 'Elegoo',
    model: 'Jupiter SE',
    technology: 'SLA',
    build: [277, 156, 300],
    enclosed: true,
  },
  // Formlabs
  { brand: 'Formlabs', model: 'Form 3', technology: 'SLA', build: [145, 145, 185], enclosed: true },
  {
    brand: 'Formlabs',
    model: 'Form 3+',
    technology: 'SLA',
    build: [145, 145, 185],
    enclosed: true,
  },
  { brand: 'Formlabs', model: 'Form 4', technology: 'SLA', build: [200, 125, 210], enclosed: true },
  {
    brand: 'Formlabs',
    model: 'Form 4L',
    technology: 'SLA',
    build: [353, 196, 350],
    enclosed: true,
  },
  // Qidi
  { brand: 'Qidi', model: 'X-Plus 3', technology: 'FDM', build: [280, 280, 270], enclosed: true },
  { brand: 'Qidi', model: 'X-Max 3', technology: 'FDM', build: [325, 320, 315], enclosed: true },
  { brand: 'Qidi', model: 'Q1 Pro', technology: 'FDM', build: [245, 245, 245], enclosed: true },
  // Snapmaker
  { brand: 'Snapmaker', model: 'J1s', technology: 'FDM', build: [300, 200, 200], enclosed: true },
  {
    brand: 'Snapmaker',
    model: 'Artisan',
    technology: 'FDM',
    build: [400, 400, 400],
    enclosed: true,
  },
  // Raise3D
  { brand: 'Raise3D', model: 'Pro3', technology: 'FDM', build: [300, 300, 300], enclosed: true },
  { brand: 'Raise3D', model: 'E2', technology: 'FDM', build: [330, 240, 240], enclosed: true },
  // Voron (DIY community standard)
  { brand: 'Voron', model: 'V2.4 350', technology: 'FDM', build: [350, 350, 350], enclosed: true },
  {
    brand: 'Voron',
    model: 'Trident 250',
    technology: 'FDM',
    build: [250, 250, 230],
    enclosed: true,
  },
  // AnkerMake
  { brand: 'AnkerMake', model: 'M5', technology: 'FDM', build: [235, 235, 250], enclosed: false },
  { brand: 'AnkerMake', model: 'M5C', technology: 'FDM', build: [350, 350, 250], enclosed: false },
]
