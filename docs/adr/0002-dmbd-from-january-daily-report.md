# DMBD follows the January daily report, not the 022C database

A Breakdown is one row of the January 2025 daily report (site 023C, sheet JANUARI 2025): start date, finish date, unit status (BD, RFU, OP), problem, hour meter, operator, and work order. Start date and BD date are the same moment and are stored once. The pending sheet is one dashboard view of rows still in BD, grouped by fleet, with age = today − start date. Breakdown codes and component codes are read from SAP. The workbook sheet BD & Comp Code is not a master.

**Status**: accepted

**Considered Options**:

- The 022C DATABASE sheet (READY / BREAKDOWN / CANCEL, one aging formula, 5,705 rows) as the core record.
- Copying B0–BS and CC01–CC17 out of BD & Comp Code into our own master.
- Storing the pending sheet as a second table.

**Consequences**:

- A unit that stays down is one breakdown. RD 056 appears once, dated from its start, not once per day.
- Start date and BD date are one column. Pending age and duration both use it. Do not copy the sheet formula `(FINISH − BD DATE) × 24`: a blank finish is read as zero and becomes about −1,095,792 hours. Duration is finish date minus start date, and only when the finish date is filled.
- OP is not Stand by. On this file RFU is remarked OK, and BD and OP are remarked CONTINUE. The PDF standby card is outside this reference.
- Progress labels on the pending sheet (Mayor BD, Wait Part, P1), ETA, a second hour meter, and service estimate are not columns of the daily row. The view can show them only after those fields are added to the breakdown. Until then it shows unit, model, problem, start, age, breakdown code, and BD/RFU.
- The work-order number is on the row. MR, PR, PO, and Priority are not.
- A breakdown is the service call. It has many activities. The activity code and the position (BD, OP, SB, AJ) live on the activity, not on the breakdown. The code list is UDO `MIS_ACTIVITY`. `OSCL.Resolution` is the closing text on the breakdown and is written to `ServiceCalls.Resolution`. Component code stays `MIS_COMPONENTNO`. Do not copy CC01–CC17.
- Unit identity stays the fleet cache. The Populasi Unit sheet in this workbook is not the master.
- DATA pendingan and CANNIBAL REPORT are not sources. The cannibal sheet is an empty June 2022 template.
- Maintenance Control PA still subtracts failure downtime. Pointing PA at breakdown duration is a separate change.
