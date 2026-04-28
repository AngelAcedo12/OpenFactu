-- Módulo de Recursos Humanos.
--
-- Empleados, departamentos, puestos, contratos, nóminas y ausencias.
-- La integración con contabilidad es por `AccountMapping` kind=payroll_*
-- (gastos de personal, SS empresa, HP IRPF, remuneraciones pendientes).
-- Imputación analítica via costCenterId del empleado o del departamento.

CREATE TABLE IF NOT EXISTS "{{schema}}"."Department" (
  "id"                 TEXT PRIMARY KEY,
  "code"               TEXT NOT NULL UNIQUE,
  "name"               TEXT NOT NULL,
  "parentId"           TEXT REFERENCES "{{schema}}"."Department"("id") ON DELETE SET NULL,
  "managerEmployeeId"  TEXT,
  "costCenterId"       TEXT REFERENCES "{{schema}}"."CostCenter"("id") ON DELETE SET NULL,
  "isActive"           BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"          TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."Position" (
  "id"             TEXT PRIMARY KEY,
  "code"           TEXT NOT NULL UNIQUE,
  "name"           TEXT NOT NULL,
  "departmentId"   TEXT REFERENCES "{{schema}}"."Department"("id") ON DELETE SET NULL,
  "description"    TEXT,
  "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."Employee" (
  "id"               TEXT PRIMARY KEY,
  "code"             TEXT NOT NULL UNIQUE,
  "firstName"        TEXT NOT NULL,
  "lastName"         TEXT NOT NULL,
  "dni"              TEXT,
  "email"            TEXT,
  "phone"            TEXT,
  "birthDate"        DATE,
  "hireDate"         DATE,
  "terminationDate"  DATE,
  "address"          JSONB,
  "iban"             TEXT,
  "departmentId"     TEXT REFERENCES "{{schema}}"."Department"("id") ON DELETE SET NULL,
  "costCenterId"     TEXT REFERENCES "{{schema}}"."CostCenter"("id") ON DELETE SET NULL,
  "profitCenterId"   TEXT REFERENCES "{{schema}}"."ProfitCenter"("id") ON DELETE SET NULL,
  "status"           TEXT NOT NULL DEFAULT 'active',   -- active | leave | terminated
  "userId"           TEXT,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Employee_status_idx" ON "{{schema}}"."Employee"("status");

CREATE TABLE IF NOT EXISTS "{{schema}}"."Contract" (
  "id"                  TEXT PRIMARY KEY,
  "employeeId"          TEXT NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "positionId"          TEXT REFERENCES "{{schema}}"."Position"("id") ON DELETE SET NULL,
  "type"                TEXT NOT NULL DEFAULT 'indefinite',   -- indefinite | temporary | intern | freelance
  "startDate"           DATE NOT NULL,
  "endDate"             DATE,
  "grossSalary"         DECIMAL(15,2) NOT NULL DEFAULT 0,
  "paymentsPerYear"     INTEGER NOT NULL DEFAULT 12,
  "workHoursPerWeek"    DECIMAL(5,2) DEFAULT 40,
  "collectiveAgreement" TEXT,
  "isActive"            BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"           TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Contract_employee_idx"
  ON "{{schema}}"."Contract" ("employeeId", "isActive");

CREATE TABLE IF NOT EXISTS "{{schema}}"."Payroll" (
  "id"               TEXT PRIMARY KEY,
  "employeeId"       TEXT NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "contractId"       TEXT REFERENCES "{{schema}}"."Contract"("id"),
  "periodYear"       INTEGER NOT NULL,
  "periodMonth"      INTEGER NOT NULL,
  "gross"            DECIMAL(15,2) NOT NULL DEFAULT 0,
  "irpfAmount"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "ssEmployee"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "ssEmployer"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "netPay"           DECIMAL(15,2) NOT NULL DEFAULT 0,
  "status"           TEXT NOT NULL DEFAULT 'draft',   -- draft | approved | paid
  "journalEntryId"   TEXT REFERENCES "{{schema}}"."JournalEntry"("id") ON DELETE SET NULL,
  "paymentId"        TEXT,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
  "approvedAt"       TIMESTAMP,
  "approvedBy"       TEXT,
  UNIQUE ("employeeId", "periodYear", "periodMonth")
);
CREATE INDEX IF NOT EXISTS "Payroll_period_idx"
  ON "{{schema}}"."Payroll" ("periodYear", "periodMonth");

CREATE TABLE IF NOT EXISTS "{{schema}}"."PayrollLine" (
  "id"           TEXT PRIMARY KEY,
  "payrollId"    TEXT NOT NULL REFERENCES "{{schema}}"."Payroll"("id") ON DELETE CASCADE,
  "concept"      TEXT NOT NULL,
  "type"         TEXT NOT NULL,   -- earning | deduction | employer_cost
  "amount"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "accountId"    TEXT REFERENCES "{{schema}}"."ChartOfAccount"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "PayrollLine_payroll_idx" ON "{{schema}}"."PayrollLine"("payrollId");

CREATE TABLE IF NOT EXISTS "{{schema}}"."Leave" (
  "id"           TEXT PRIMARY KEY,
  "employeeId"   TEXT NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "type"         TEXT NOT NULL,   -- vacation | sick | parental | unpaid | other
  "startDate"    DATE NOT NULL,
  "endDate"      DATE NOT NULL,
  "days"         DECIMAL(5,2),
  "status"       TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected | taken
  "approvedBy"   TEXT,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Leave_employee_idx" ON "{{schema}}"."Leave"("employeeId", "startDate");
