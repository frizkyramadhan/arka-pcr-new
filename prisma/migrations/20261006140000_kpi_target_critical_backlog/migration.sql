-- Critical Backlog target (spec sections 10–11: critical count, 0 green / 1 yellow / >1 red), all sites and programs.
INSERT INTO `kpi_targets` (`id`, `kpi_code`, `project_id`, `maintenance_type_id`, `target_value`, `direction`, `yellow_margin`, `effective_from`, `updated_at`) VALUES
  (UUID(), 'CRITICAL_BACKLOG', '*', '*', 0.00, 'COUNT_ZERO', 0.00, '2026-01-01', CURRENT_TIMESTAMP(3));
