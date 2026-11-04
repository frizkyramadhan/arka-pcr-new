# Breakdown: one open BD-position per unit, parallel AJ, history Excel import

Accepted 2026-10-29 after design grilling. A unit may have at most one open breakdown whose latest activity position is BD; additional open episodes must be AJ (often separate SAP work orders). Status position stays on Activity only. Summary board shows RFU unless an open BD-position episode exists; open AJ appears on the breakdowns list only. Closing a breakdown requires every activity to have an end. History import seeds from the site daily-report Excel (one row = breakdown + activity, same WO merges as extra activity), links existing WO by DocNum when found, never creates SAP WO, never PATCHes SAP close. Build order: open-rule + form warning → close gate → import/export. Glossary: `CONTEXT.md` (DMBD). Full checklist: `MEMORY.md` 2026-10-29.

## Considered options

- Keep a single open breakdown per unit (rejected: blocks parallel additional-job WOs).
- Store Position Status on the breakdown header (rejected: double source of truth).
- Import creates SAP WO / closes SAP (rejected: unsafe for history seed).
