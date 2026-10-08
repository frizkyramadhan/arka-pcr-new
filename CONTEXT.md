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
The monthly schedule for one site, one program, and one month. Its total is how many Plan Details it contains.
_Avoid_: a typed quantity as the source of the schedule, a due date, a planned hour meter, PCR Forecast

**Plan Detail**:
One scheduled performance on a Maintenance Plan: a Unit and the plan date it should be done.
_Avoid_: a second plan row for the same unit, program, and date

**Maintenance Actual**:
The execution of one Plan Detail, dated by the day it was done. Hour meter is the unit's HM at that execution.
_Avoid_: a second due date, planned HM, Replacement / WO close

**Failure**:
One defect or breakdown on a Unit, identified by the SAP failure code. It stays open until closed. Each later Maintenance Actual on that Unit while it is still open raises its frequency by one, and that failure is a repeat finding. Photos belong to the Failure.
_Avoid_: Finding as a separate record, a new failure row for the same open defect

**Attachment**:
A file bound to a Maintenance Actual (or plan) stored on local disk under `UPLOAD_DIR`.
_Avoid_: Installation report (PCR replacement PDF)

**Achievement (FMS)**:
Plan vs actual compliance for maintenance programs by site and month.
_Avoid_: PCR forecast achievement (Close/Open)

**Achievement (PCR)**:
Forecast open/close rates by project and plan period.
_Avoid_: FMS achievement
