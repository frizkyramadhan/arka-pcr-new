-- Nomor register breakdown: BD-{project}.{yymm}-{seq}. Urut per site dan bulan BD date (started_at).

ALTER TABLE `breakdowns`
    ADD COLUMN `register_no` VARCHAR(32) NULL;

UPDATE `breakdowns` AS target
INNER JOIN (
    SELECT
        bd.id,
        CONCAT(
            'BD-',
            bd.project_code,
            '.',
            DATE_FORMAT(bd.started_at, '%y%m'),
            '-',
            LPAD(
                ROW_NUMBER() OVER (
                    PARTITION BY bd.project_code, DATE_FORMAT(bd.started_at, '%y%m')
                    ORDER BY bd.created_at, bd.id
                ),
                4,
                '0'
            )
        ) AS register_no
    FROM `breakdowns` AS bd
) AS numbered ON numbered.id = target.id
SET target.register_no = numbered.register_no;

ALTER TABLE `breakdowns`
    MODIFY `register_no` VARCHAR(32) NOT NULL,
    ADD UNIQUE INDEX `breakdowns_register_no_key`(`register_no`);
