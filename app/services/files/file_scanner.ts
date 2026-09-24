export interface ScanVerdict {
  ok: boolean
  reason: string | null
}

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

const EXECUTABLE_SIGNATURES: Array<[string, Buffer]> = [
  ['Windows executable', Buffer.from('MZ')],
  ['Linux executable', Buffer.from([0x7f, 0x45, 0x4c, 0x46])],
  ['macOS executable', Buffer.from([0xcf, 0xfa, 0xed, 0xfe])],
  ['script', Buffer.from('#!')],
  ['Java class', Buffer.from([0xca, 0xfe, 0xba, 0xbe])],
]

/**
 * First line of defence at upload. This is signature-level only (no engine): it rejects files that
 * are not the model format they claim and known test malware. A real scanner (ClamAV) can be put
 * behind the same `scan` call — see docs/DEPLOY_NOTES.md.
 */
export function scanModelFile(buffer: Buffer, format: 'STL' | '3MF' | 'OBJ'): ScanVerdict {
  const head = buffer.subarray(0, 8192)
  if (head.toString('latin1').includes(EICAR)) {
    return { ok: false, reason: 'Rejected by the malware check' }
  }
  for (const [label, magic] of EXECUTABLE_SIGNATURES) {
    if (buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic)) {
      return { ok: false, reason: `This is a ${label}, not a 3D model` }
    }
  }

  if (format === '3MF') {
    // a 3MF is a zip archive
    if (!(buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b)) {
      return { ok: false, reason: 'A .3mf file must be a zip archive' }
    }
  } else if (format === 'OBJ') {
    if (head.includes(0)) return { ok: false, reason: 'A .obj file must be plain text' }
  } else if (format === 'STL') {
    const text = head.subarray(0, 5).toString('ascii').toLowerCase()
    const binary = buffer.length >= 84 && buffer.length === 84 + buffer.readUInt32LE(80) * 50
    if (text !== 'solid' && !binary) {
      return { ok: false, reason: 'This does not look like an STL file' }
    }
  }
  return { ok: true, reason: null }
}
