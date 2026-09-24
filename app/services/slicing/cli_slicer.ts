import { execFile } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import {
  parseGcodeStats,
  SlicerError,
  type SliceResult,
  type Slicer,
} from '#services/slicing/slicer'

const run = promisify(execFile)
const TIMEOUT_MS = 120_000

/**
 * OrcaSlicer/PrusaSlicer-style command line. Profile files live in one directory:
 * `machine.json`, `filament.json` and `process_<PROFILE_CODE>.json`, exported so that every value
 * is spelled out (no "inherits"). Bringing profiles up on a new host is a one-off task — see
 * docs/DEPLOY_NOTES.md.
 */
export default class CliSlicer implements Slicer {
  readonly name = 'orca-cli'

  constructor(
    private binary: string,
    private profilesDir: string
  ) {}

  async slice(input: {
    filePath: string
    profileCode: string
    workDir: string
  }): Promise<SliceResult> {
    const machine = join(this.profilesDir, 'machine.json')
    const process = join(this.profilesDir, `process_${input.profileCode}.json`)
    const filament = join(this.profilesDir, 'filament.json')
    try {
      await run(
        this.binary,
        [
          '--slice',
          '0',
          '--load-settings',
          `${machine};${process}`,
          '--load-filaments',
          filament,
          '--outputdir',
          input.workDir,
          input.filePath,
        ],
        { timeout: TIMEOUT_MS }
      )
    } catch (error) {
      throw new SlicerError(`Slicing failed: ${(error as Error).message.slice(0, 200)}`)
    }
    const files = await readdir(input.workDir)
    const gcode = files.find((f) => f.endsWith('.gcode'))
    if (!gcode) throw new SlicerError('The slicer produced no G-code')
    const stats = parseGcodeStats(await readFile(join(input.workDir, gcode), 'utf8'))
    return { ...stats, supportGrams: 0, slicer: this.name }
  }
}
