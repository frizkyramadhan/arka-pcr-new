-- Discriminator for ba_approval rows (cannibal vs future forecast/pcr on same table).
ALTER TABLE `ba_approval`
  ADD COLUMN `document_type` VARCHAR(20) NOT NULL DEFAULT 'CANNIBAL' AFTER `id_ba`;

CREATE INDEX `ba_approval_document_type_idx` ON `ba_approval`(`document_type`);
