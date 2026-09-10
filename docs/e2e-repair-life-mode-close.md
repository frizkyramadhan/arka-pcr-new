# E2E — Repair Life Mode on Close Replacement

**Date:** 2026-09-10T03:29:19.925Z

## Objective

Verify `closeReplacement()` respects forecast `repairLifeMode`:
- **CONTINUE_LIFE / RETURN:** closed row keeps calculated life; spawned OPEN carries `compHour`.
- **BACK_TO_ZERO:** closed row `compLife`/`lifePercent` = 0; spawned OPEN `compHour` = 0.
- **Warranty:** spawn `compHour` = 0; closed row normal calculated life.

## Code changes

- `lib/replacement/close-life-policy.ts` — policy helpers
- `lib/replacement/service.ts` — `closeReplacement()` wired to forecast context

## Candidate selection

| Warranty candidate | id_rep=14140 | lifePercent=30.89% | compHour=38323 |

| Repair candidates |
| --- |
| id_rep=14236 | DT14-SBI — SUSPENSI RR LH | compHour=54371 |
| id_rep=9676 | DZ 006 — SPROCKET LH | compHour=40445 |

## Scenarios executed

### Warranty

- **id_rep:** 14140
- **Forecast:** 57
- **isWarranty:** true

| Step | OK | Detail |
| --- | --- | --- |
| pick replacement | ✅ | id_rep=14140, compHour=38323 |
| create forecast | ✅ | id_forecast=57 |
| submit BA | ✅ |  |
| approve all | ✅ | status=APPROVED |
| convert to replacement | ✅ |  |
| upload installation report | ✅ |  |
| close replacement | ✅ | closed id_rep=14140 |
| verify closed life | ✅ | compLife=5561, lifePercent=30.9, expectReset=false |
| verify spawn compHour | ✅ | spawn id=15025, compHour=0, expectCarry=false |

**After close:**

| Metric | Value |
| before compHour | 38323 |
| closed compLife | 5561 |
| closed lifePercent | 30.9 |
| spawned compHour | 0 |
| spawned id_rep | 15025 |

### Repair CONTINUE_LIFE

- **id_rep:** 14236
- **Forecast:** 58
- **isWarranty:** false
- **pcrSupplyCategory:** REPAIR
- **repairLifeMode:** CONTINUE_LIFE

| Step | OK | Detail |
| --- | --- | --- |
| pick replacement | ✅ | id_rep=14236, compHour=54371 |
| create forecast | ✅ | id_forecast=58 |
| submit BA | ✅ |  |
| approve all | ✅ | status=APPROVED |
| convert to replacement | ✅ |  |
| dummy procurement | ✅ |  |
| upload installation report | ✅ |  |
| close replacement | ✅ | closed id_rep=14236 |
| verify closed life | ✅ | compLife=108858.5, lifePercent=777.6, expectReset=false |
| verify spawn compHour | ✅ | spawn id=15026, compHour=54371, expectCarry=true |

**After close:**

| Metric | Value |
| before compHour | 54371 |
| closed compLife | 108858.5 |
| closed lifePercent | 777.6 |
| spawned compHour | 54371 |
| spawned id_rep | 15026 |

### Repair BACK_TO_ZERO

- **id_rep:** 9676
- **Forecast:** 59
- **isWarranty:** false
- **pcrSupplyCategory:** REPAIR
- **repairLifeMode:** BACK_TO_ZERO

| Step | OK | Detail |
| --- | --- | --- |
| pick replacement | ✅ | id_rep=9676, compHour=40445 |
| create forecast | ✅ | id_forecast=59 |
| submit BA | ✅ |  |
| approve all | ✅ | status=APPROVED |
| convert to replacement | ✅ |  |
| dummy procurement | ✅ |  |
| upload installation report | ✅ |  |
| close replacement | ✅ | closed id_rep=9676 |
| verify closed life | ✅ | compLife=0, lifePercent=0, expectReset=true |
| verify spawn compHour | ✅ | spawn id=15027, compHour=0, expectCarry=false |

**After close:**

| Metric | Value |
| before compHour | 40445 |
| closed compLife | 0 |
| closed lifePercent | 0 |
| spawned compHour | 0 |
| spawned id_rep | 15027 |

## Summary

**All scenarios passed.**