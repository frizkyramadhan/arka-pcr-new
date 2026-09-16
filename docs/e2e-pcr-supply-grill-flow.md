# E2E — PCR Supply Grill (Forecast → BA → Convert → Close)

**Generated:** 2026-09-15T06:32:57.881Z

## Build

`npm run build` — **success** (see terminal run on same date).

## Data picks (local DB `arka_pcr_new`)

```json
{
  "warranty": {
    "id_rep": 14182,
    "unit": "E 042",
    "comp": "MOTOR FAN DRIVE",
    "lifePercent": 20.27
  },
  "ptaAps": {
    "id_rep": 15026,
    "unit": "DT14-SBI",
    "comp": "SUSPENSI RR LH"
  },
  "newOnSite": {
    "id_rep": 15006,
    "unit": "E 071",
    "comp": "PUMP 2"
  },
  "repairContinue": {
    "id_rep": 14858,
    "unit": "RD 111",
    "comp": "TRANSMISSION"
  },
  "repairBackZero": {
    "id_rep": 14839,
    "unit": "E 074",
    "comp": "CYLINDER BOOM"
  },
  "repairDealer": {
    "id_rep": 14807,
    "unit": "ADT 008",
    "comp": "FRONT FINAL DRIVE RH"
  },
  "cannibalOtherUnit": {
    "noBa": "2552023293",
    "statusBa": "CLOSE",
    "donorFleetUnitId": 59,
    "donorUnitNo": "E 031",
    "installFleetUnitId": 469,
    "installUnitNo": "E 077",
    "idMod": 3124,
    "compDesc": "CYLINDER BUCKET"
  }
}
```

## Scenarios

### Warranty · Original Unit

| Step | OK | Detail |
| --- | --- | --- |
| create forecast | ✅ | id_forecast=60 |
| submit BA PCR | ✅ |  |
| approve chain | ✅ | baPcrStatus=APPROVED |
| convert to WO | ✅ | id_rep=14183, returnTo=null, cannibal=— |
| target WO unit | ✅ | E 042 (fleetUnitId=97) |
| installation report | ✅ |  |
| close WO | ✅ | oldcore=undefined, prediction=undefined |

**Forecast row (after run):**

```json
{
  "idForecast": 60,
  "idRep": 14183,
  "unitNo": "E 042",
  "compDesc": "MOTOR FAN DRIVE",
  "pcrSupplyCategory": null,
  "repairSite": null,
  "repairVendorKind": null,
  "repairDealerName": null,
  "repairLifeMode": null,
  "pcrComponentGrade": null,
  "pcrReturnTo": null,
  "returnOtherFleetUnitId": null,
  "cannibalNoBa": null,
  "convertedAt": "2026-09-15T06:32:55.426Z",
  "isWarranty": true
}
```

**Replacement closed:**

```json
{
  "idRep": 14183,
  "unitNo": "E 042",
  "woStatus": "CLOSE",
  "oldcoreStatus": null,
  "predictionOldcore": null,
  "compLife": "2432.8",
  "lifePercent": "20.3",
  "compHour": 0,
  "poNo": null
}
```

### PTA Reman · Out Site · APS · Ex Repair · Continue Life · Original

| Step | OK | Detail |
| --- | --- | --- |
| create forecast | ✅ | id_forecast=61 |
| submit BA PCR | ✅ |  |
| approve chain | ✅ | baPcrStatus=APPROVED |
| convert to WO | ✅ | id_rep=15026, returnTo=ORIGINAL_UNIT, cannibal=— |
| target WO unit | ✅ | DT14-SBI (fleetUnitId=533) |
| procurement fields | ✅ |  |
| installation report | ✅ |  |
| close WO | ✅ | oldcore=FIRST_LIFE_80, prediction=FULL_CORE |

**Forecast row (after run):**

```json
{
  "idForecast": 61,
  "idRep": 15026,
  "unitNo": "DT14-SBI",
  "compDesc": "SUSPENSI RR LH",
  "pcrSupplyCategory": "PTA_REMAN",
  "repairSite": "OUT_SITE",
  "repairVendorKind": "APS",
  "repairDealerName": null,
  "repairLifeMode": "CONTINUE_LIFE",
  "pcrComponentGrade": "EX_REPAIR",
  "pcrReturnTo": "ORIGINAL_UNIT",
  "returnOtherFleetUnitId": null,
  "cannibalNoBa": null,
  "convertedAt": "2026-09-15T06:32:55.762Z",
  "isWarranty": false
}
```

**Replacement closed:**

```json
{
  "idRep": 15026,
  "unitNo": "DT14-SBI",
  "woStatus": "CLOSE",
  "oldcoreStatus": "FIRST_LIFE_80",
  "predictionOldcore": "FULL_CORE",
  "compLife": "54371",
  "lifePercent": "388.4",
  "compHour": 54371,
  "poNo": "PO-E2E-15026"
}
```

### New Component · On Site · Back to Zero · Original

| Step | OK | Detail |
| --- | --- | --- |
| create forecast | ✅ | id_forecast=62 |
| submit BA PCR | ✅ |  |
| approve chain | ✅ | baPcrStatus=APPROVED |
| convert to WO | ✅ | id_rep=15006, returnTo=ORIGINAL_UNIT, cannibal=— |
| target WO unit | ✅ | E 071 (fleetUnitId=115) |
| procurement fields | ✅ |  |
| installation report | ✅ |  |
| close WO | ✅ | oldcore=SECOND_LIFE_60, prediction=PARTIAL_CORE |

**Forecast row (after run):**

```json
{
  "idForecast": 62,
  "idRep": 15006,
  "unitNo": "E 071",
  "compDesc": "PUMP 2",
  "pcrSupplyCategory": "NEW_COMPONENT",
  "repairSite": "ON_SITE",
  "repairVendorKind": null,
  "repairDealerName": null,
  "repairLifeMode": "BACK_TO_ZERO",
  "pcrComponentGrade": null,
  "pcrReturnTo": "ORIGINAL_UNIT",
  "returnOtherFleetUnitId": null,
  "cannibalNoBa": null,
  "convertedAt": "2026-09-15T06:32:56.240Z",
  "isWarranty": false
}
```

**Replacement closed:**

```json
{
  "idRep": 15006,
  "unitNo": "E 071",
  "woStatus": "CLOSE",
  "oldcoreStatus": "SECOND_LIFE_60",
  "predictionOldcore": "PARTIAL_CORE",
  "compLife": "0",
  "lifePercent": "0",
  "compHour": 4377,
  "poNo": "PO-E2E-15006"
}
```

### Repair · On Site · Continue Life · Original

| Step | OK | Detail |
| --- | --- | --- |
| create forecast | ✅ | id_forecast=63 |
| submit BA PCR | ✅ |  |
| approve chain | ✅ | baPcrStatus=APPROVED |
| convert to WO | ✅ | id_rep=14858, returnTo=ORIGINAL_UNIT, cannibal=— |
| target WO unit | ✅ | RD 111 (fleetUnitId=817) |
| procurement fields | ✅ |  |
| installation report | ✅ |  |
| close WO | ✅ | oldcore=THIRD_LIFE_40, prediction=BER |

**Forecast row (after run):**

```json
{
  "idForecast": 63,
  "idRep": 14858,
  "unitNo": "RD 111",
  "compDesc": "TRANSMISSION",
  "pcrSupplyCategory": "REPAIR",
  "repairSite": "ON_SITE",
  "repairVendorKind": null,
  "repairDealerName": null,
  "repairLifeMode": "CONTINUE_LIFE",
  "pcrComponentGrade": null,
  "pcrReturnTo": "ORIGINAL_UNIT",
  "returnOtherFleetUnitId": null,
  "cannibalNoBa": null,
  "convertedAt": "2026-09-15T06:32:56.581Z",
  "isWarranty": false
}
```

**Replacement closed:**

```json
{
  "idRep": 14858,
  "unitNo": "RD 111",
  "woStatus": "CLOSE",
  "oldcoreStatus": "THIRD_LIFE_40",
  "predictionOldcore": "BER",
  "compLife": "28174.1",
  "lifePercent": "176.1",
  "compHour": 26537,
  "poNo": "PO-E2E-14858"
}
```

### Repair · On Site · Back to Zero · Original

| Step | OK | Detail |
| --- | --- | --- |
| create forecast | ✅ | id_forecast=64 |
| submit BA PCR | ✅ |  |
| approve chain | ✅ | baPcrStatus=APPROVED |
| convert to WO | ✅ | id_rep=14839, returnTo=ORIGINAL_UNIT, cannibal=— |
| target WO unit | ✅ | E 074 (fleetUnitId=472) |
| procurement fields | ✅ |  |
| installation report | ✅ |  |
| close WO | ✅ | oldcore=FIRST_LIFE_80, prediction=FULL_CORE |

**Forecast row (after run):**

```json
{
  "idForecast": 64,
  "idRep": 14839,
  "unitNo": "E 074",
  "compDesc": "CYLINDER BOOM",
  "pcrSupplyCategory": "REPAIR",
  "repairSite": "ON_SITE",
  "repairVendorKind": null,
  "repairDealerName": null,
  "repairLifeMode": "BACK_TO_ZERO",
  "pcrComponentGrade": null,
  "pcrReturnTo": "ORIGINAL_UNIT",
  "returnOtherFleetUnitId": null,
  "cannibalNoBa": null,
  "convertedAt": "2026-09-15T06:32:56.961Z",
  "isWarranty": false
}
```

**Replacement closed:**

```json
{
  "idRep": 14839,
  "unitNo": "E 074",
  "woStatus": "CLOSE",
  "oldcoreStatus": "FIRST_LIFE_80",
  "predictionOldcore": "FULL_CORE",
  "compLife": "0",
  "lifePercent": "0",
  "compHour": 29521,
  "poNo": "PO-E2E-14839"
}
```

### Repair · Out Site · Dealer · Continue Life · Original

| Step | OK | Detail |
| --- | --- | --- |
| create forecast | ✅ | id_forecast=65 |
| submit BA PCR | ✅ |  |
| approve chain | ✅ | baPcrStatus=APPROVED |
| convert to WO | ✅ | id_rep=14807, returnTo=ORIGINAL_UNIT, cannibal=— |
| target WO unit | ✅ | ADT 008 (fleetUnitId=793) |
| procurement fields | ✅ |  |
| installation report | ✅ |  |
| close WO | ✅ | oldcore=SECOND_LIFE_60, prediction=PARTIAL_CORE |

**Forecast row (after run):**

```json
{
  "idForecast": 65,
  "idRep": 14807,
  "unitNo": "ADT 008",
  "compDesc": "FRONT FINAL DRIVE RH",
  "pcrSupplyCategory": "REPAIR",
  "repairSite": "OUT_SITE",
  "repairVendorKind": "DEALER",
  "repairDealerName": "E2E Dealer Workshop",
  "repairLifeMode": "CONTINUE_LIFE",
  "pcrComponentGrade": null,
  "pcrReturnTo": "ORIGINAL_UNIT",
  "returnOtherFleetUnitId": null,
  "cannibalNoBa": null,
  "convertedAt": "2026-09-15T06:32:57.260Z",
  "isWarranty": false
}
```

**Replacement closed:**

```json
{
  "idRep": 14807,
  "unitNo": "ADT 008",
  "woStatus": "CLOSE",
  "oldcoreStatus": "SECOND_LIFE_60",
  "predictionOldcore": "PARTIAL_CORE",
  "compLife": "13185.5",
  "lifePercent": "73.3",
  "compHour": 7028,
  "poNo": "PO-E2E-14807"
}
```

### Repair · On Site · Continue Life · Other Unit + Cannibal BA

| Step | OK | Detail |
| --- | --- | --- |
| create forecast | ✅ | id_forecast=66 |
| submit BA PCR | ✅ |  |
| approve chain | ✅ | baPcrStatus=APPROVED |
| convert to WO | ✅ | id_rep=15034, returnTo=OTHER_UNIT, cannibal=2552023293 |
| target WO unit | ✅ | E 077 (fleetUnitId=469) |
| procurement fields | ✅ |  |
| installation report | ✅ |  |
| close WO | ✅ | oldcore=FIRST_LIFE_80, prediction=FULL_CORE |

**Forecast row (after run):**

```json
{
  "idForecast": 66,
  "idRep": 15034,
  "unitNo": "E 031",
  "compDesc": "CYLINDER BUCKET",
  "pcrSupplyCategory": "REPAIR",
  "repairSite": "ON_SITE",
  "repairVendorKind": null,
  "repairDealerName": null,
  "repairLifeMode": "CONTINUE_LIFE",
  "pcrComponentGrade": null,
  "pcrReturnTo": "OTHER_UNIT",
  "returnOtherFleetUnitId": 469,
  "cannibalNoBa": "2552023293",
  "convertedAt": "2026-09-15T06:32:57.738Z",
  "isWarranty": false
}
```

**Replacement closed:**

```json
{
  "idRep": 15034,
  "unitNo": "E 077",
  "woStatus": "CLOSE",
  "oldcoreStatus": "FIRST_LIFE_80",
  "predictionOldcore": "FULL_CORE",
  "compLife": "24281.5",
  "lifePercent": "242.8",
  "compHour": 0,
  "poNo": "PO-E2E-15034"
}
```

## Summary

**All grill scenarios passed.**