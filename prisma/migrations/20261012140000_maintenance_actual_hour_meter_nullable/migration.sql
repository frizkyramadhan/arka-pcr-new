-- Hour meter pada actual boleh kosong saat diisi dari Excel plan.
ALTER TABLE `maintenance_actuals` MODIFY `hour_meter` INTEGER NULL;
