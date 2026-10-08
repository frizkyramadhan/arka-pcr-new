-- Repeat Finding Rate target (spec section 6: ≤5%, lower is better), all sites and programs.
INSERT INTO `kpi_targets` (`id`, `kpi_code`, `project_id`, `maintenance_type_id`, `target_value`, `direction`, `yellow_margin`, `effective_from`, `updated_at`) VALUES
  (UUID(), 'REPEAT_FINDING', '*', '*', 5.00, 'LOWER', 10.00, '2026-01-01', CURRENT_TIMESTAMP(3));
