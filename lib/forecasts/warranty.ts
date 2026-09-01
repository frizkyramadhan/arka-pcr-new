/**
 * Warranty eligibility — life still under component policy (lifePercent < 100).
 */
export function isUnderPolicy(lifePercent: number | string | null | undefined): boolean {
  const value = Number(lifePercent)

  return Number.isFinite(value) && value < 100
}
