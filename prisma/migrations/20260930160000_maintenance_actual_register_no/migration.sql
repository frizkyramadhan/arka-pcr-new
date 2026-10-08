-- Nomor register actual: PM-{project}.{yymm}-{seq}. Urut per site dan bulan tanggal pelaksanaan.

ALTER TABLE `maintenance_actuals`
    ADD COLUMN `register_no` VARCHAR(32) NULL;

UPDATE `maintenance_actuals` AS target
INNER JOIN (
    SELECT
        actual.id,
        CONCAT(
            'PM-',
            plan.project_id,
            '.',
            DATE_FORMAT(actual.maintenance_date, '%y%m'),
            '-',
            LPAD(
                ROW_NUMBER() OVER (
                    PARTITION BY plan.project_id, DATE_FORMAT(actual.maintenance_date, '%y%m')
                    ORDER BY actual.created_at, actual.id
                ),
                4,
                '0'
            )
        ) AS register_no
    FROM `maintenance_actuals` AS actual
    INNER JOIN `maintenance_plans` AS plan ON plan.id = actual.maintenance_plan_id
) AS numbered ON numbered.id = target.id
SET target.register_no = numbered.register_no;

ALTER TABLE `maintenance_actuals`
    MODIFY `register_no` VARCHAR(32) NOT NULL,
    ADD UNIQUE INDEX `maintenance_actuals_register_no_key`(`register_no`);
