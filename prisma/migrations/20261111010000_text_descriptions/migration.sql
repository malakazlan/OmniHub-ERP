-- AlterTable
ALTER TABLE `stock_movements` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `gate_passes` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `vehicles` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `vehicle_expenses` MODIFY `description` TEXT NULL,
    MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `ledger_entries` MODIFY `description` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `journal_entries` MODIFY `description` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `journal_lines` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `payments` MODIFY `description` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `expenses` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `employee_attendance` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `salary_records` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `salary_advances` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `employee_commissions` MODIFY `notes` TEXT NULL;

