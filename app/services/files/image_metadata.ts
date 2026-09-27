import DomainError from '#exceptions/domain_error'

/**
 * Removes metadata from uploaded photos without re-encoding them (review fix 6): phones write GPS
 * coordinates, device owner and camera serials into EXIF/XMP, and maker photos reach buyers and
 * the public shop, so they could reveal where a workshop is (business rule 1).
 *
 * JPEG keeps only its Orientation (as a minimal new EXIF block) so photos still show upright;
 * ICC colour profiles stay. PNG and WebP drop their metadata chunks. Anything that does not parse
 * as the declared type is refused rather than stored as is.
 */

/** The upload is not the image it claims to be: refused (422), never stored as is. */
export class ImageMetadataError extends DomainError {}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
/** PNG chunks that carry text, EXIF or time metadata. */
const PNG_DROP = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME'])
/** JPEG segments dropped: APP1 (EXIF/XMP), APP13 (IPTC/Photoshop), COM. APP2 (ICC) stays. */
const JPEG_DROP = new Set([0xe1, 0xed, 0xfe])
/** WebP chunks dropped, and the VP8X flag bits that announced them. */
const WEBP_DROP = new Set(['EXIF', 'XMP '])
const VP8X_EXIF_XMP_FLAGS = 0b0000_1100

export function stripImageMetadata(input: Buffer, contentType: string): Buffer {
  if (contentType === 'image/jpeg') return stripJpeg(input)
  if (contentType === 'image/png') return stripPng(input)
  if (contentType === 'image/webp') return stripWebp(input)
  throw new ImageMetadataError(`Unsupported image type: ${contentType}`)
}

/** The EXIF Orientation (1–8) of a JPEG, or null when it has none. */
export function orientationOf(jpeg: Buffer): number | null {
  for (const seg of jpegSegments(jpeg)) {
    if (seg.marker !== 0xe1) continue
    const value = exifOrientation(jpeg.subarray(seg.start + 4, seg.end))
    if (value !== null) return value
  }
  return null
}

function stripJpeg(input: Buffer): Buffer {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) {
    throw new ImageMetadataError('Not a JPEG image')
  }
  const orientation = orientationOf(input)
  const parts: Buffer[] = [input.subarray(0, 2)]
  if (orientation !== null && orientation !== 1) parts.push(orientationSegment(orientation))
  for (const seg of jpegSegments(input)) {
    if (seg.marker === 0xda) {
      // start of scan: image data (and, for progressive JPEGs, further scans) up to the first
      // end-of-image marker. Scan data never holds FF D9 (0xFF is stuffed as FF 00), so whatever
      // follows EOI is an appended image — iPhones add them, with their own EXIF and GPS.
      const eoi = input.indexOf(Buffer.from([0xff, 0xd9]), seg.start + 2)
      if (eoi === -1) throw new ImageMetadataError('The JPEG has no end marker')
      parts.push(input.subarray(seg.start, eoi + 2))
      return Buffer.concat(parts)
    }
    if (JPEG_DROP.has(seg.marker) || isMpfIndex(input, seg)) continue
    parts.push(input.subarray(seg.start, seg.end))
  }
  throw new ImageMetadataError('The JPEG has no image data')
}

/** APP2 "MPF": the index of images appended after the main one (dropped with them). */
function isMpfIndex(input: Buffer, seg: { marker: number; start: number; end: number }) {
  return seg.marker === 0xe2 && input.toString('latin1', seg.start + 4, seg.start + 8) === 'MPF\0'
}

function* jpegSegments(input: Buffer): Generator<{ marker: number; start: number; end: number }> {
  let pos = 2
  while (pos + 4 <= input.length) {
    if (input[pos] !== 0xff) throw new ImageMetadataError('Malformed JPEG')
    const marker = input[pos + 1]
    if (marker === 0xff) {
      pos += 1 // fill byte
      continue
    }
    if (marker === 0xda) {
      yield { marker, start: pos, end: input.length }
      return
    }
    const length = input.readUInt16BE(pos + 2)
    const end = pos + 2 + length
    if (length < 2 || end > input.length) throw new ImageMetadataError('Malformed JPEG')
    yield { marker, start: pos, end }
    pos = end
  }
}

/** Reads Orientation (tag 0x0112) from an APP1 payload ("Exif\0\0" + TIFF), or null. */
function exifOrientation(app1: Buffer): number | null {
  if (app1.length < 14 || app1.toString('latin1', 0, 6) !== 'Exif\0\0') return null
  const tiff = app1.subarray(6)
  const order = tiff.toString('latin1', 0, 2)
  if (order !== 'II' && order !== 'MM') return null
  const le = order === 'II'
  const u16 = (o: number) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o))
  const u32 = (o: number) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o))
  if (tiff.length < 8 || u16(2) !== 42) return null
  const ifd = u32(4)
  if (ifd + 2 > tiff.length) return null
  const count = u16(ifd)
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12
    if (entry + 12 > tiff.length) return null
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8)
      return value >= 1 && value <= 8 ? value : null
    }
  }
  return null
}

/** A fresh APP1 holding a one-entry EXIF: Orientation only. */
function orientationSegment(orientation: number): Buffer {
  const tiff = Buffer.alloc(8 + 2 + 12 + 4)
  tiff.write('MM', 0, 'latin1')
  tiff.writeUInt16BE(42, 2)
  tiff.writeUInt32BE(8, 4)
  tiff.writeUInt16BE(1, 8)
  tiff.writeUInt16BE(0x0112, 10)
  tiff.writeUInt16BE(3, 12) // SHORT
  tiff.writeUInt32BE(1, 14)
  tiff.writeUInt16BE(orientation, 18)
  // next-IFD offset (0) is already zero
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff])
  const header = Buffer.alloc(4)
  header[0] = 0xff
  header[1] = 0xe1
  header.writeUInt16BE(payload.length + 2, 2)
  return Buffer.concat([header, payload])
}

function stripPng(input: Buffer): Buffer {
  if (input.length < 8 || !input.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new ImageMetadataError('Not a PNG image')
  }
  const parts: Buffer[] = [PNG_SIGNATURE]
  let pos = 8
  let sawEnd = false
  while (pos + 12 <= input.length) {
    const length = input.readUInt32BE(pos)
    const type = input.toString('latin1', pos + 4, pos + 8)
    const end = pos + 12 + length
    if (end > input.length) throw new ImageMetadataError('Malformed PNG')
    if (!PNG_DROP.has(type)) parts.push(input.subarray(pos, end))
    pos = end
    if (type === 'IEND') {
      sawEnd = true
      break
    }
  }
  if (!sawEnd) throw new ImageMetadataError('Malformed PNG')
  return Buffer.concat(parts)
}

function stripWebp(input: Buffer): Buffer {
  if (
    input.length < 12 ||
    input.toString('latin1', 0, 4) !== 'RIFF' ||
    input.toString('latin1', 8, 12) !== 'WEBP'
  ) {
    throw new ImageMetadataError('Not a WebP image')
  }
  const parts: Buffer[] = []
  let pos = 12
  while (pos + 8 <= input.length) {
    const fourcc = input.toString('latin1', pos, pos + 4)
    const size = input.readUInt32LE(pos + 4)
    const end = pos + 8 + size + (size % 2)
    if (pos + 8 + size > input.length) throw new ImageMetadataError('Malformed WebP')
    if (!WEBP_DROP.has(fourcc)) {
      const chunk = Buffer.from(input.subarray(pos, Math.min(end, input.length)))
      if (fourcc === 'VP8X' && size >= 1) chunk[8] &= ~VP8X_EXIF_XMP_FLAGS
      parts.push(chunk)
    }
    pos = end
  }
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...parts])
  const header = Buffer.alloc(8)
  header.write('RIFF', 0, 'latin1')
  header.writeUInt32LE(body.length, 4)
  return Buffer.concat([header, body])
}
