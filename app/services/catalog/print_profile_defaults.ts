export interface PrintProfileSeed {
  code: string
  name: string
  technology: 'FDM' | 'SLA' | 'SLS'
  layerHeightMicron: number
  infillPercent: number
  /** print time relative to the baseline heuristic, in basis points (10000 = 1×) */
  timeFactorBps: number
  postProcess: string | null
}

export const DEFAULT_PRINT_PROFILES: PrintProfileSeed[] = [
  {
    code: 'FDM_STANDARD',
    name: 'Standard (0.2 mm, 20% infill)',
    technology: 'FDM',
    layerHeightMicron: 200,
    infillPercent: 20,
    timeFactorBps: 10000,
    postProcess: null,
  },
  {
    code: 'FDM_FINE',
    name: 'Fine detail (0.1 mm, 20% infill)',
    technology: 'FDM',
    layerHeightMicron: 100,
    infillPercent: 20,
    timeFactorBps: 18000,
    postProcess: null,
  },
  {
    code: 'FDM_STRONG',
    name: 'Strong (0.2 mm, 50% infill)',
    technology: 'FDM',
    layerHeightMicron: 200,
    infillPercent: 50,
    timeFactorBps: 13000,
    postProcess: null,
  },
  {
    code: 'SLA_STANDARD',
    name: 'Resin standard (0.05 mm)',
    technology: 'SLA',
    layerHeightMicron: 50,
    infillPercent: 100,
    timeFactorBps: 10000,
    postProcess: 'Wash and UV cure',
  },
  {
    code: 'SLS_STANDARD',
    name: 'Powder standard (0.1 mm)',
    technology: 'SLS',
    layerHeightMicron: 100,
    infillPercent: 100,
    timeFactorBps: 10000,
    postProcess: 'Depowdered',
  },
]
