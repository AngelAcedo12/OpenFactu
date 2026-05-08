-- RRHH avanzado+: convenios, evaluaciones, comisiones, tareas/Gantt.

-- ── Convenios colectivos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."CollectiveAgreement" (
  "id" text PRIMARY KEY,
  "code" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "sector" text,
  "validFrom" date,
  "validTo" date,
  "baseSalary" numeric(15,2) DEFAULT 0,
  "vacationDays" integer DEFAULT 22,
  "weeklyHours" numeric(5,2) DEFAULT 40,
  "documentUrl" text,
  "notes" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Contratos: enriquecer con convenio + part-time + PDF firmado.
ALTER TABLE "{{schema}}"."Contract"
  ADD COLUMN IF NOT EXISTS "collectiveAgreementId" text,
  ADD COLUMN IF NOT EXISTS "probationDays" integer,
  ADD COLUMN IF NOT EXISTS "noticeDays" integer,
  ADD COLUMN IF NOT EXISTS "isPartTime" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "partTimeRatio" numeric(4,3),
  ADD COLUMN IF NOT EXISTS "documentUrl" text,
  ADD COLUMN IF NOT EXISTS "signedAt" timestamp;

-- ── Evaluaciones de desempeño ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."EvaluationCycle" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."EvaluationCompetency" (
  "id" text PRIMARY KEY,
  "code" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "weight" numeric(5,2) DEFAULT 1,
  "scaleMax" integer NOT NULL DEFAULT 5,
  "isActive" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."EmployeeEvaluation" (
  "id" text PRIMARY KEY,
  "cycleId" text NOT NULL REFERENCES "{{schema}}"."EvaluationCycle"("id") ON DELETE CASCADE,
  "employeeId" text NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "managerId" text REFERENCES "{{schema}}"."Employee"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "selfReviewedAt" timestamp,
  "managerReviewedAt" timestamp,
  "finalScore" numeric(5,2),
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."EmployeeEvaluationScore" (
  "id" text PRIMARY KEY,
  "evaluationId" text NOT NULL REFERENCES "{{schema}}"."EmployeeEvaluation"("id") ON DELETE CASCADE,
  "competencyId" text NOT NULL REFERENCES "{{schema}}"."EvaluationCompetency"("id") ON DELETE CASCADE,
  "scoreSelf" numeric(5,2),
  "scoreManager" numeric(5,2),
  "comments" text
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."EmployeeObjective" (
  "id" text PRIMARY KEY,
  "employeeId" text NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "cycleId" text REFERENCES "{{schema}}"."EvaluationCycle"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "description" text,
  "targetMetric" text,
  "targetValue" numeric(15,2),
  "achievedValue" numeric(15,2),
  "weight" numeric(5,2) DEFAULT 1,
  "status" text NOT NULL DEFAULT 'pending',
  "dueDate" date,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- ── Comisiones comerciales ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."CommissionRule" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "scope" text NOT NULL DEFAULT 'employee',
  "employeeId" text REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "departmentId" text REFERENCES "{{schema}}"."Department"("id") ON DELETE SET NULL,
  "basis" text NOT NULL DEFAULT 'net_amount',
  "kind" text NOT NULL DEFAULT 'flat_pct',
  "pct" numeric(6,3) DEFAULT 0,
  "tiers" jsonb,
  "payrollConceptId" text REFERENCES "{{schema}}"."PayrollConcept"("id") ON DELETE SET NULL,
  "validFrom" date,
  "validTo" date,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."CommissionAccrual" (
  "id" text PRIMARY KEY,
  "employeeId" text NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "ruleId" text REFERENCES "{{schema}}"."CommissionRule"("id") ON DELETE SET NULL,
  "periodYear" integer NOT NULL,
  "periodMonth" integer NOT NULL,
  "sourceDocType" text NOT NULL,
  "sourceDocId" text NOT NULL,
  "base" numeric(15,2) NOT NULL DEFAULT 0,
  "amount" numeric(15,2) NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'pending',
  "payrollLineId" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "paidAt" timestamp
);
CREATE INDEX IF NOT EXISTS "CommissionAccrual_emp_period_idx"
  ON "{{schema}}"."CommissionAccrual" ("employeeId", "periodYear", "periodMonth");
CREATE UNIQUE INDEX IF NOT EXISTS "CommissionAccrual_doc_uniq"
  ON "{{schema}}"."CommissionAccrual" ("sourceDocType", "sourceDocId", "employeeId");

-- Atribución de ventas a comerciales.
ALTER TABLE "{{schema}}"."SalesInvoice" ADD COLUMN IF NOT EXISTS "salesAgentId" text;
ALTER TABLE "{{schema}}"."SalesOrder" ADD COLUMN IF NOT EXISTS "salesAgentId" text;
ALTER TABLE "{{schema}}"."SalesDeliveryNote" ADD COLUMN IF NOT EXISTS "salesAgentId" text;

-- ── Tareas + Gantt ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."Task" (
  "id" text PRIMARY KEY,
  "code" text UNIQUE NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'todo',
  "priority" text NOT NULL DEFAULT 'normal',
  "assigneeId" text REFERENCES "{{schema}}"."Employee"("id") ON DELETE SET NULL,
  "internalOrderId" text REFERENCES "{{schema}}"."InternalOrder"("id") ON DELETE SET NULL,
  "departmentId" text REFERENCES "{{schema}}"."Department"("id") ON DELETE SET NULL,
  "startDate" date,
  "dueDate" date,
  "estimatedHours" numeric(8,2),
  "actualHours" numeric(8,2) DEFAULT 0,
  "progress" integer NOT NULL DEFAULT 0,
  "parentTaskId" text,
  "notes" text,
  "createdBy" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "closedAt" timestamp
);
CREATE INDEX IF NOT EXISTS "Task_assignee_idx" ON "{{schema}}"."Task" ("assigneeId");
CREATE INDEX IF NOT EXISTS "Task_project_idx" ON "{{schema}}"."Task" ("internalOrderId");

CREATE TABLE IF NOT EXISTS "{{schema}}"."TaskDependency" (
  "id" text PRIMARY KEY,
  "predecessorId" text NOT NULL REFERENCES "{{schema}}"."Task"("id") ON DELETE CASCADE,
  "successorId" text NOT NULL REFERENCES "{{schema}}"."Task"("id") ON DELETE CASCADE,
  "kind" text NOT NULL DEFAULT 'finish_to_start',
  "lagDays" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."TaskComment" (
  "id" text PRIMARY KEY,
  "taskId" text NOT NULL REFERENCES "{{schema}}"."Task"("id") ON DELETE CASCADE,
  "userId" text,
  "body" text NOT NULL,
  "at" timestamp NOT NULL DEFAULT now()
);

-- Imputación opcional de fichajes a tarea.
ALTER TABLE "{{schema}}"."TimeclockEntry" ADD COLUMN IF NOT EXISTS "taskId" text;
