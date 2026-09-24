import { SlicerError, type SliceResult, type Slicer } from '#services/slicing/slicer'

/** Deterministic stand-in: numbers derive from the profile code so tests can assert them. */
export default class FakeSlicer implements Slicer {
  readonly name = 'fake'
  calls: Array<{ filePath: string; profileCode: string }> = []
  failWith: string | null = null

  constructor(private result: Partial<SliceResult> = {}) {}

  async slice(input: { filePath: string; profileCode: string }): Promise<SliceResult> {
    this.calls.push({ filePath: input.filePath, profileCode: input.profileCode })
    if (this.failWith) throw new SlicerError(this.failWith)
    return { grams: 12.5, supportGrams: 1.25, printMinutes: 95, slicer: this.name, ...this.result }
  }
}
