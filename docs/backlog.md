**Purpose**: Future features and improvements for ARKA MMS (Maintenance Monitoring System)
**Last Updated**: 2026-02-19

# Feature Backlog - ARKA MMS

## Next Sprint (High Priority)

### RBAC — ganti kolom legacy User (level, sign, pcr_sign, project_code)

- **Description**: Implementasi penuh draft `docs/rbac-migration-draft.md` — permission catalog, role templates, refactor API/UI, form User hanya roles + projects
- **User Value**: Satu tempat konfigurasi akses; tidak duplikasi level/sign di form user
- **Effort**: Large (1–2 minggu, 5 fase)
- **Dependencies**: Modul Users/Roles/Permissions UI (done), user_projects pivot (done)
- **Acceptance Criteria**:
  - User drawer tanpa level/sign/pcrSign
  - Semua `isSuperUserOrAdmin` / workflow approval pakai permission
  - Migrasi user lama ke role setara
  - Kolom legacy di-drop setelah staging verified

### Redis Cache & Queue

- **Description**: Integrate Redis for caching unit data and queueing report generation
- **User Value**: Faster unit lookups, non-blocking report generation
- **Effort**: Medium (1 week)
- **Dependencies**: Docker Compose, optional infrastructure per design
- **Acceptance Criteria**:
  - Unit cache with TTL
  - Report generation via queue
  - Worker process for background jobs

### Worker Node / Scheduler

- **Description**: Implement cron jobs for MISSED status, monthly/yearly report generation, unit sync
- **User Value**: Automated compliance tracking, up-to-date unit data
- **Effort**: Medium (1-2 weeks)
- **Dependencies**: Scheduler design in maintenance-monitoring-system.md §6
- **Acceptance Criteria**:
  - Plan past date without actual → status MISSED
  - Monthly report auto-generate
  - Yearly report auto-generate
  - Unit sync from external API on schedule

### Dashboard Charts

- **Description**: Maintenance per type, Plan vs Actual trend, Hour meter trend
- **User Value**: Visual monitoring, compliance insights
- **Effort**: Small (3-5 days)
- **Dependencies**: Dashboard base, chart library (e.g. Recharts)
- **Acceptance Criteria**:
  - Maintenance per type chart
  - Plan vs Actual trend over time
  - Hour meter trend per unit

## Upcoming Features (Medium Priority)

### External Unit API Integration

- **Description**: Full integration with external unit API (configurable endpoint, auth)
- **User Value**: Accurate unit data, project assignment from source
- **Effort**: Medium
- **Acceptance Criteria**:
  - Configurable API URL and auth
  - Sync on demand and scheduled
  - Handle API errors gracefully

### Activity Log

- **Description**: Audit log for maintenance actions (plan created, actual input, mechanic assigned)
- **User Value**: Audit trail, compliance tracking
- **Effort**: Small
- **Acceptance Criteria**:
  - Log key actions with user and timestamp
  - Filterable by entity type and date

### Export Reports (Excel/PDF)

- **Description**: Export monthly/yearly reports to Excel and PDF
- **User Value**: Offline sharing, archival
- **Effort**: Small
- **Acceptance Criteria**:
  - Excel export with compliance data
  - PDF summary report

## Future Ideas (Low Priority)

### Mobile-Friendly Input

- **Description**: Optimize actual maintenance input for mobile (mechanic on-site)
- **User Value**: Easier data entry in the field
- **Effort**: Medium

### Multi-Project Dashboard Filter

- **Description**: Filter dashboard by project for ADMIN_SITE
- **User Value**: Focused view per site
- **Effort**: Small
