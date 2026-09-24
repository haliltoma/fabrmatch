import { DisputeEvidenceSchema } from '#database/schema'

export default class DisputeEvidence extends DisputeEvidenceSchema {
  // 'evidence' is uncountable; Lucid would otherwise look for "dispute_evidences".
  static table = 'dispute_evidence'
}
