-- COUNT_ZERO targets now read yellow_margin (spec section 11: Critical count 0 = green, 1 = yellow, >1 = red,
-- thresholds editable in Master KPI Target). Before this the code fixed the yellow band at +1 and ignored the column,
-- so existing rows were saved with 0. Set them to 1 to keep the colours users already see.
UPDATE `kpi_targets` SET `yellow_margin` = 1 WHERE `direction` = 'COUNT_ZERO' AND `yellow_margin` = 0;
