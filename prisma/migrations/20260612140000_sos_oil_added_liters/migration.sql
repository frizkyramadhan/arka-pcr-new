-- oil_added: boolean → liters (decimal), reset legacy boolean values
UPDATE `sos` SET `oil_added` = NULL;
ALTER TABLE `sos` MODIFY `oil_added` DECIMAL(8, 3) NULL;
