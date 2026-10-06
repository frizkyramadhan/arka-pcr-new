-- SOS hour oil / hour unit accept decimals from lab reports (e.g. 240.5), aligned with hm_unit Decimal(12,2).
ALTER TABLE `sos`
    MODIFY `h_oil` DECIMAL(12, 2) NULL,
    MODIFY `h_unit` DECIMAL(12, 2) NULL;
