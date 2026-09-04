/** True while `next build` is running (`NEXT_PHASE=phase-production-build`). */
export function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build"
}
