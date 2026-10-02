import { createHash } from 'node:crypto'
import { Socket } from 'node:net'
import env from '#start/env'

/** Checks a model upload goes through, in order; shown to the uploader so they see what ran. */
export type ScanCheck =
  'size' | 'signatures' | 'active_content' | 'structure' | 'archive' | 'antivirus' | 'integrity'

export interface ScanVerdict {
  ok: boolean
  reason: string | null
  /** checks that ran and passed (or, when ok is false, ran up to the failing one) */
  checks: ScanCheck[]
  engine: 'signatures' | 'clamav'
}

export type ModelFormat = 'STL' | '3MF' | 'OBJ'

export const MAX_MODEL_BYTES = 200 * 1024 * 1024
/** Largest file the account-free instant price accepts. */
export const MAX_QUICK_BYTES = 15 * 1024 * 1024
const MAX_TRIANGLES = 10_000_000
const MAX_ZIP_ENTRIES = 2000
const MAX_ZIP_UNPACKED = 1024 * 1024 * 1024
const MAX_ZIP_RATIO = 200

const EICAR = Buffer.from(
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
  'latin1'
)

const EXECUTABLE_SIGNATURES: Array<[string, Buffer]> = [
  ['This is a Windows program, not a 3D model', Buffer.from('MZ')],
  ['This is a Linux program, not a 3D model', Buffer.from([0x7f, 0x45, 0x4c, 0x46])],
  ['This is a macOS program, not a 3D model', Buffer.from([0xcf, 0xfa, 0xed, 0xfe])],
  ['This is a macOS program, not a 3D model', Buffer.from([0xca, 0xfe, 0xba, 0xbe])],
  ['This is a script, not a 3D model', Buffer.from('#!')],
]

/**
 * Markers of content a browser, interpreter or OS could act on. A model file never needs them,
 * so finding one anywhere means someone is smuggling something inside a "model".
 */
const HIDES_SCRIPT = 'The file hides a script; it was blocked'
const HIDES_PAGE = 'The file hides a web page; it was blocked'
const HIDES_COMMAND = 'The file hides a system command; it was blocked'
const ACTIVE_MARKERS: Array<[string, string]> = [
  ['<script', HIDES_SCRIPT],
  ['javascript:', HIDES_SCRIPT],
  ['vbscript:', HIDES_SCRIPT],
  ['<?php', 'The file hides PHP code; it was blocked'],
  ['<html', HIDES_PAGE],
  ['<iframe', HIDES_PAGE],
  ['<svg', HIDES_PAGE],
  ['powershell', HIDES_COMMAND],
  ['cmd.exe', HIDES_COMMAND],
  ['this program cannot be run in dos mode', 'The file hides a Windows program; it was blocked'],
  ['%pdf-', 'The file hides a PDF document; it was blocked'],
]
const ZIP_LOCAL_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04])

function reject(reason: string, checks: ScanCheck[]): ScanVerdict {
  return { ok: false, reason, checks, engine: 'signatures' }
}

/** Case-insensitive search over the whole file in overlapping chunks; returns the refusal reason. */
function findMarker(buffer: Buffer): string | null {
  const CHUNK = 8 * 1024 * 1024
  const overlap = 64
  for (let start = 0; start < buffer.length; start += CHUNK) {
    const text = buffer
      .subarray(Math.max(0, start - overlap), Math.min(buffer.length, start + CHUNK))
      .toString('latin1')
      .toLowerCase()
    for (const [marker, reason] of ACTIVE_MARKERS) if (text.includes(marker)) return reason
  }
  return null
}

const NUM = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?`
const ASCII_STL_LINE = new RegExp(
  [
    String.raw`^\s*$`,
    String.raw`^\s*(?:solid|endsolid)(?:\s+[\w .,:()\-+/#@]*)?\s*$`,
    String.raw`^\s*facet\s+normal\s+${NUM}\s+${NUM}\s+${NUM}\s*$`,
    String.raw`^\s*outer\s+loop\s*$`,
    String.raw`^\s*vertex\s+${NUM}\s+${NUM}\s+${NUM}\s*$`,
    String.raw`^\s*endloop\s*$`,
    String.raw`^\s*endfacet\s*$`,
  ].join('|'),
  'i'
)
const OBJ_LINE =
  /^\s*(?:$|#.*|(?:v|vt|vn|vp|f|l|p|o|g|s|usemtl|mtllib|cstype|deg|curv|parm|end)(?:\s.*)?)$/

function isPlainText(buffer: Buffer) {
  for (const byte of buffer) {
    if (byte === 9 || byte === 10 || byte === 13) continue
    if (byte < 32 || byte === 127) return false
  }
  return true
}

function checkStl(buffer: Buffer): string | null {
  const triangles = buffer.length >= 84 ? buffer.readUInt32LE(80) : -1
  const binary = triangles >= 0 && buffer.length === 84 + triangles * 50
  if (binary) {
    if (triangles > MAX_TRIANGLES) return 'This model has too many triangles to process'
    for (let i = 0; i < triangles; i++) {
      const o = 84 + i * 50 + 12
      for (let k = 0; k < 9; k++) {
        if (!Number.isFinite(buffer.readFloatLE(o + k * 4))) {
          return 'The STL has invalid coordinates'
        }
      }
    }
    return null
  }
  if (!buffer.subarray(0, 5).toString('ascii').toLowerCase().startsWith('solid')) {
    return 'This does not look like an STL file'
  }
  if (!isPlainText(buffer)) return 'This does not look like an STL file'
  const lines = buffer.toString('latin1').split(/\r?\n/)
  for (const line of lines) {
    if (!ASCII_STL_LINE.test(line)) return 'The STL contains content that is not part of a 3D model'
  }
  return null
}

function checkObj(buffer: Buffer): string | null {
  if (!isPlainText(buffer)) return 'A .obj file must be plain text'
  for (const line of buffer.toString('latin1').split(/\r?\n/)) {
    if (!OBJ_LINE.test(line)) return 'The OBJ contains content that is not part of a 3D model'
  }
  return null
}

/** Reads the zip central directory: no extraction, just names and declared sizes. */
function checkZip(buffer: Buffer): string | null {
  if (!(buffer.length > 22 && buffer.subarray(0, 4).equals(ZIP_LOCAL_HEADER))) {
    return 'A .3mf file must be a zip archive'
  }
  const from = Math.max(0, buffer.length - 65_557)
  let eocd = -1
  for (let i = buffer.length - 22; i >= from; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return 'The .3mf archive is damaged'
  const entries = buffer.readUInt16LE(eocd + 10)
  let offset = buffer.readUInt32LE(eocd + 16)
  if (entries > MAX_ZIP_ENTRIES) return 'The .3mf archive has too many files'
  let unpacked = 0
  for (let n = 0; n < entries; n++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      return 'The .3mf archive is damaged'
    }
    const packed = buffer.readUInt32LE(offset + 20)
    const size = buffer.readUInt32LE(offset + 24)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extra = buffer.readUInt16LE(offset + 30)
    const comment = buffer.readUInt16LE(offset + 32)
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8')
    if (name.startsWith('/') || name.includes('..') || name.includes('\\')) {
      return 'The .3mf archive contains an unsafe path'
    }
    if (/\.(exe|dll|bat|cmd|com|scr|ps1|sh|js|vbs|jar|msi|html?|svg|php)$/i.test(name)) {
      return 'The .3mf archive contains a file that is not part of a 3D model'
    }
    unpacked += size
    if (packed > 0 && size / packed > MAX_ZIP_RATIO)
      return 'The .3mf archive is suspiciously compressed'
    offset += 46 + nameLength + extra + comment
  }
  if (unpacked > MAX_ZIP_UNPACKED) return 'The .3mf archive unpacks to more than 1 GB'
  return null
}

/**
 * Everything that needs no external engine: size, known malware and executable signatures anywhere
 * in the file, hidden active content, and a strict read of the model's own structure.
 */
export function scanModelFile(buffer: Buffer, format: ModelFormat): ScanVerdict {
  const checks: ScanCheck[] = []
  if (buffer.length === 0) return reject('The file is empty', checks)
  if (buffer.length > MAX_MODEL_BYTES) return reject('The file is over 200 MB', checks)
  checks.push('size')

  if (buffer.includes(EICAR)) return reject('Rejected by the malware check', checks)
  for (const [reason, magic] of EXECUTABLE_SIGNATURES) {
    if (buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic)) {
      return reject(reason, checks)
    }
  }
  checks.push('signatures')

  if (format !== '3MF') {
    const found = findMarker(buffer)
    if (found) return reject(found, checks)
    if (buffer.includes(ZIP_LOCAL_HEADER))
      return reject('The file hides an archive; it was blocked', checks)
  }
  checks.push('active_content')

  const problem =
    format === 'STL' ? checkStl(buffer) : format === 'OBJ' ? checkObj(buffer) : checkZip(buffer)
  if (problem) return reject(problem, checks)
  checks.push(format === '3MF' ? 'archive' : 'structure')

  return { ok: true, reason: null, checks, engine: 'signatures' }
}

/** ClamAV INSTREAM over TCP. Resolves with the virus name, or null when the file is clean. */
function clamavScan(buffer: Buffer, host: string, port: number): Promise<string | null> {
  return new Promise((resolve, fail) => {
    const socket = new Socket()
    let reply = ''
    socket.setTimeout(30_000, () => socket.destroy(new Error('antivirus timed out')))
    socket.on('data', (d) => (reply += d.toString()))
    socket.on('error', fail)
    socket.on('close', () => {
      const text = reply.replace(/\0/g, '').trim()
      if (text.endsWith('OK')) return resolve(null)
      const found = /:\s*(.+)\s+FOUND$/.exec(text)
      if (found) return resolve(found[1])
      fail(new Error(`antivirus answered: ${text || 'nothing'}`))
    })
    socket.connect(port, host, () => {
      socket.write('zINSTREAM\0')
      const CHUNK = 64 * 1024
      for (let i = 0; i < buffer.length; i += CHUNK) {
        const part = buffer.subarray(i, i + CHUNK)
        const size = Buffer.alloc(4)
        size.writeUInt32BE(part.length)
        socket.write(size)
        socket.write(part)
      }
      socket.end(Buffer.alloc(4))
    })
  })
}

/**
 * The full upload scan: the static checks, then the antivirus engine when CLAMAV_HOST is set, then
 * (for stored files) that the bytes are exactly the ones registered. With an engine configured the
 * scan fails closed — if the engine cannot answer, the file is not accepted.
 */
export async function scanUpload(
  buffer: Buffer,
  format: ModelFormat,
  expected?: { sha256?: string | null; sizeBytes?: number | null }
): Promise<ScanVerdict> {
  const verdict = scanModelFile(buffer, format)
  if (!verdict.ok) return verdict

  const host = env.get('CLAMAV_HOST')
  if (host) {
    try {
      const virus = await clamavScan(buffer, host, env.get('CLAMAV_PORT', 3310))
      if (virus) {
        return {
          ok: false,
          reason: 'Rejected by the antivirus scan',
          checks: verdict.checks,
          engine: 'clamav',
        }
      }
    } catch {
      return {
        ok: false,
        reason: 'The virus scanner is not answering. Try again in a few minutes.',
        checks: verdict.checks,
        engine: 'clamav',
      }
    }
    verdict.checks.push('antivirus')
    verdict.engine = 'clamav'
  }

  if (expected?.sha256 || expected?.sizeBytes) {
    if (expected.sizeBytes && Number(expected.sizeBytes) !== buffer.length) {
      return { ...verdict, ok: false, reason: 'The stored file does not match the upload' }
    }
    if (expected.sha256) {
      const actual = createHash('sha256').update(buffer).digest('hex')
      if (actual !== expected.sha256.toLowerCase()) {
        return { ...verdict, ok: false, reason: 'The stored file does not match the upload' }
      }
    }
    verdict.checks.push('integrity')
  }
  return verdict
}
