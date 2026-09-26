/** Counters the server sends to the home page; null when below the honesty threshold. */
export type HomeStats = {
  makers: number | null
  technologies: number | null
  materials: number | null
  ratings: { count: number; average: number } | null
  confirmDays: number
}
