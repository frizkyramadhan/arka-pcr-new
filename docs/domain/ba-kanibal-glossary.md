# BA Kanibal — glossary (arka-pcr-new)

Terms from form `ARKA/PLT/IV/09.01` (file named Rev 5, footer Rev 4), mapped to **this** codebase (Prisma + RBAC). `user.sign` L1/L2/L3 **does not exist** here.

## Bounded context

**Berita Acara Kanibal** authorizes taking a serviceable component off one unit (REMOVE FROM) and installing it on another (INSTALL TO). Distinct from **BA PCR** (forecast approval).

## Glossary

| Term | Meaning | In arka-pcr-new |
| --- | --- | --- |
| **BA** | Document header | `Ba` |
| **Kanibal line** | One REMOVE or INSTALL side | `Kanibal` (`type`, `pairIndex`) |
| **Plant Statement** | Exactly one of: P1 Unit RFU, Production Requirements, Other | `ba.plant_*` — UI already radio |
| **Logistic Statement** | Exactly one of: No Stock, Lead Time Part (days), Other | `ba.logistic_*` — UI already radio |
| **Creator** | Plant user who **creates** the BA (Foreman / plant). Not the form Request By. | `ba.createdBy` |
| **Cannibal Request By** | Form jabatan, pick one: Supt. Production, PJO, GM Operation, GM Plant. | `ba.cannibal_request_role` |
| **Requestor** | User who holds that jabatan and signs REQUEST BY. | `ba.requested_by` (FK, not `statementRequestedBy`) |
| **REQUEST BY (print)** | TTD requestor + jabatan | `ba.requestor` / `requested_by` |
| **PJO** | Same as **Project Manager** | role `project_manager` / `cannibals.approve.PM` |
| **GM Operation** | Same as **Operational General Manager (OGM)** | role `operational_gm` / `cannibals.approve.OGM` |
| **GM Plant** | Same as **Plant General Manager (PGM)** / role `plant_manager` | role `plant_manager` / `cannibals.approve.PGM` |
| **Supt. Production** | Requester-only. **Not** Plant Superintendent (PS) who approves | new role `production_superintendent` |
| **Requestor confirmation** | Selected `requested_by` confirms/rejects after Plant submit, before Logistics | new status `PENDING_REQUESTOR` (not in PS→PD chain) |
| **P1 Unit RFU** | Plant justification: priority-1 unit must return to Ready For Use. | `ba.plantP1UnitRfu` |
| **Requestor reject** | Requestor menolak kanibal. BA kembali ke Plant sebagai acuan **naikkan order P1**. Plant boleh **ubah data** (mis. plant statement) dan **submit ulang** BA yang sama. | status `REJECTED` (sudah plant-editable) |
| **Plant Superintendent (PS)** | First cannibal approver / Dept Head | role `plant_superintendent` |
| **CONFIRMED BY Logistic** | Logistics confirms No Stock / Lead Time | `ba.statementConfirmedBy` + role `logistics` |
| **Approval chain** | PS → PM → OGM → PGM → OD → PD | `ba_approval` + `CANNIBAL_BA_APPROVAL_CHAIN` |
| **Cannibalized Component Status** | Brand New, PEX / Reman, As Is Repair, Other. **RESEAL ONLY hidden** on new UI; lookup kept. | `ba.idStatus` + `ba_status` |
| **Symptom / Failure Cause** | Legacy. Hidden in new UI; not required. Columns kept. | `ba.symptom`, `ba.idCaused` |

## Decided (this grilling)

1. Plant + Logistic: pick one each, both required. Already matches UI in this app.
2. Request By jabatan: pick one; TTD is a user who holds that jabatan (not automatically `created_by` / Foreman).
3. PJO = PM = `project_manager`.
4. Supt. Production is **separate** from `plant_superintendent` (PS approver).
5. GM Operation = `operational_gm` (OGM). Same user pool for Request By and approval.
6. GM Plant = `plant_manager` (PGM). Same user pool for Request By and approval.
7. **Creator ≠ Requestor.** Plant user remains `createdBy`. Requestor is new columns: `cannibal_request_role` + `requested_by`. Do not reuse `statementRequestedBy`.
8. New RBAC role **`production_superintendent`** (Supt. Production requester).
9. The selected **requestor must confirm in-app**, like an approval step (not a passive name on the form).
10. Requestor confirmation is **after Plant submit, before Logistics** (`PENDING_REQUESTOR`). Only `requested_by` may confirm/reject.
11. Requestor **reject** returns the BA to Plant as a **planning reference to raise P1 orders**. Plant **may still edit** (e.g. plant statement) and **resubmit the same BA**.
12. Resubmit from `DRAFT`/`REJECTED` **always** re-enters `PENDING_REQUESTOR`. Requestor may change; prior confirmation is cleared.
13. **Symptom and Failure Cause are hidden** in new UI and not required. Do not drop columns (legacy data).
14. **RESEAL ONLY** is hidden on the new component-status form. Keep the `ba_status` row for legacy BAs.

## Open

None on form/columns. Implemented 2026-08-20 (`PENDING_REQUESTOR`, role `production_superintendent`, hide symptom/cause/RESEAL ONLY).
