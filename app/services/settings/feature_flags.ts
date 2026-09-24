import fabrmatchConfig from '#config/fabrmatch'

export type FeatureName = keyof typeof fabrmatchConfig.flags

/** Half-built features stay dark until an admin turns them on (settings sync keeps this live). */
export function featureEnabled(name: FeatureName): boolean {
  return fabrmatchConfig.flags[name] === 1
}
