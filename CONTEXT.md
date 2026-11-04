# APMS (ARKA Plant Management System)

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

### DMBD

**DMBD**:
Daily monitoring of operational breakdowns: a unit goes down and later becomes ready for use.
_Avoid_: FMS, PCR

**Breakdown**:
One repair episode of a unit, usually one SAP work order. It has a start date, an optional finish date, a problem, an hour meter, an operator, and a resolution. Position lives on its activities, not on the breakdown row. A unit may have at most one open breakdown whose latest activity position is BD; other open episodes must be AJ.
_Avoid_: Activity, Failure, a new row every day, a stored position field on the breakdown

**Activity**:
One work slice on a breakdown: an activity code, a position, a start and end, and a technician. A breakdown has many. Closing a breakdown requires every activity to have an end.
_Avoid_: the breakdown itself, a second work order

**Additional job episode**:
An open breakdown whose latest activity position is AJ, often a separate work order for other damage while a BD episode may still be open. Same work order with other damage is another activity on that breakdown, not a second BD-position episode.
_Avoid_: a second open BD on the same unit, stuffing other damage into the problem text only

**Resolution**:
The closing text on a breakdown. It is stored on the SAP service call.
_Avoid_: activity notes, the problem text

**Start date**:
The day the unit went down. On the daily report this is the same moment as the BD date. Age on the pending board counts from this day.
_Avoid_: a separate report date, an activity start

**Unit status**:
On the Summary board: RFU when the unit has no open BD-position breakdown; BD detail only from that open BD episode. Open AJ episodes do not make the Summary board non-RFU; they appear on the breakdowns list. Elsewhere, ready for use still means the episode has a finish date, and while open the latest activity carries the position.
_Avoid_: a separate RFU value inside the activity position, fleet status ACTIVE, treating every open work order as board BD

**Status position**:
The position of one activity: BD, OP, SB (standby), or AJ (additional job). Never stored as its own column on the breakdown.
_Avoid_: Ready for use, fleet status ACTIVE, Position Status on the breakdown header

**Pending board**:
The dashboard view of breakdowns whose latest activity is still BD, grouped by fleet, aged from the breakdown start date through today.
_Avoid_: a second breakdown record, the whole DMBD dashboard

**Summary board**:
The Reports Summary Breakdown population of ACTIVE units for a site: RFU rows stay visible; BD columns fill only from an open BD-position episode. Open AJ is out of this board’s BD columns.
_Avoid_: the breakdowns list, DMBD pending board, one row per open AJ

**Work order status**:
OPEN or CLOSE on the SAP work order. CLOSE does not mean the unit is ready for use.
_Avoid_: Maintenance Actual status CLOSED, a finish date

**Breakdown code**:
The activity code on one activity, `U_MIS_ActCode`. The list is the MIS_ACTIVITY master (B0, B12, BS, and the rest).
_Avoid_: damage code, a code list copied from a spreadsheet, a column on the breakdown itself

**Component code**:
Which system on the unit failed. SAP owns the list.
_Avoid_: a spreadsheet component list, a PCR component
