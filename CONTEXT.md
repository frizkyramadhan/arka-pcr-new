# ARKA PCR + FMS

Web monitoring for planned component replacement (PCR) and fundamental maintenance (FMS) on mining heavy equipment.

## Language

**FMS**:
Fundamental Maintenance System — plan vs actual monitoring for program maintenance (inspection, washing, greasing, etc.).
_Avoid_: MMS, Maintenance Monitoring System

**PCR**:
Planned Component Replacement — forecast, work order, BA, and cannibal workflows for major components.
_Avoid_: FMS (different domain)

**Unit**:
A heavy-equipment asset identified by Fleet API `fleetUnitId`, cached in `fleet_equipment_cache`. Shared by PCR and FMS.
_Avoid_: FMS `units` table, equipment (except UI labels)

**Maintenance Type**:
A named program of fundamental maintenance (e.g. Inspection, Greasing).
_Avoid_: PCR component type, commod

**Maintenance Plan**:
Monthly planned count of a Maintenance Type for a project (`sumPlan`).
_Avoid_: PCR Forecast

**Maintenance Actual**:
A recorded execution of a Maintenance Plan against a Unit (with optional attachments).
_Avoid_: Replacement / WO close

**Attachment**:
A file bound to a Maintenance Actual (or plan) stored on local disk under `UPLOAD_DIR`.
_Avoid_: Installation report (PCR replacement PDF)

**Achievement (FMS)**:
Plan vs actual compliance for maintenance programs by site and month.
_Avoid_: PCR forecast achievement (Close/Open)

**Achievement (PCR)**:
Forecast open/close rates by project and plan period.
_Avoid_: FMS achievement
