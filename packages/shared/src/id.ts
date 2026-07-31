let seq = 0

/** Stable-enough unique id for field-array row keys. */
export function createId(prefix = 'row'): string {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`
}

export function resetIdSeqForTests(): void {
  seq = 0
}
