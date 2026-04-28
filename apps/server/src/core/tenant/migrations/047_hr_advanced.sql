-- Plan 2 — RRHH avanzado.
--
-- Tipos de incidencia configurables, incidencias, sustituciones,
-- plantillas y patrones de turnos por horas, asignaciones materializadas,
-- fichajes y kioskos. Ampliación de Employee con kioskPin.
--
-- Activación por flags: hrShiftsEnabled, hrTimeclockEnabled,
-- hrIncidentsEnabled, hrPlanningEnabled (en SystemConfig.flags).
-- Permisos por path en cada ruta (p.ej. '/hr/timeclock', '/hr/incidents').

-- ── Empleado: PIN para kioskos ─────────────────────────────────────
ALTER TABLE "{{schema}}"."Employee"
  ADD COLUMN IF NOT EXISTS "kioskPin" TEXT;

-- ── Tipos de incidencia (catálogo configurable) ────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."IncidentType" (
  "id"                    TEXT PRIMARY KEY,
  "code"                  TEXT NOT NULL UNIQUE,
  "name"                  TEXT NOT NULL,
  "requiresSubstitution"  BOOLEAN NOT NULL DEFAULT FALSE,
  "affectsPayroll"        BOOLEAN NOT NULL DEFAULT FALSE,
  "consumesLeaveBalance"  BOOLEAN NOT NULL DEFAULT FALSE,
  "requiresDocument"      BOOLEAN NOT NULL DEFAULT FALSE,
  "paid"                  BOOLEAN NOT NULL DEFAULT TRUE,
  "color"                 TEXT,
  "isActive"              BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"             TIMESTAMP NOT NULL DEFAULT now()
);

-- ── Incidencias concretas ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."Incident" (
  "id"             TEXT PRIMARY KEY,
  "employeeId"     TEXT NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "incidentTypeId" TEXT NOT NULL REFERENCES "{{schema}}"."IncidentType"("id") ON DELETE RESTRICT,
  "startAt"        TIMESTAMP NOT NULL,
  "endAt"          TIMESTAMP,
  "status"         TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | covered
  "documentUrl"    TEXT,
  "notes"          TEXT,
  "createdBy"      TEXT,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
  "approvedBy"     TEXT,
  "approvedAt"     TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Incident_employee_idx" ON "{{schema}}"."Incident" ("employeeId", "startAt");
CREATE INDEX IF NOT EXISTS "Incident_status_idx" ON "{{schema}}"."Incident" ("status");

-- ── Sustituciones ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."Substitution" (
  "id"                    TEXT PRIMARY KEY,
  "incidentId"            TEXT NOT NULL REFERENCES "{{schema}}"."Incident"("id") ON DELETE CASCADE,
  "originalEmployeeId"    TEXT NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "substituteEmployeeId"  TEXT NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "shiftAssignmentId"     TEXT,
  "status"                TEXT NOT NULL DEFAULT 'proposed',  -- proposed | accepted | rejected
  "notifiedAt"            TIMESTAMP,
  "respondedAt"           TIMESTAMP,
  "notes"                 TEXT,
  "createdAt"             TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Substitution_incident_idx" ON "{{schema}}"."Substitution" ("incidentId");

-- ── Plantillas y patrones de turno ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."ShiftTemplate" (
  "id"            TEXT PRIMARY KEY,
  "code"          TEXT NOT NULL UNIQUE,
  "name"          TEXT NOT NULL,
  "startTime"     TEXT NOT NULL,         -- 'HH:mm'
  "endTime"       TEXT NOT NULL,
  "breakMinutes"  INTEGER NOT NULL DEFAULT 0,
  "color"         TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."ShiftPattern" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "cycleWeeks"  INTEGER NOT NULL DEFAULT 1,
  "slots"       JSONB NOT NULL DEFAULT '[]',   -- [{week,dayOfWeek,shiftTemplateId}]
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."ShiftPatternAssignment" (
  "id"          TEXT PRIMARY KEY,
  "patternId"   TEXT NOT NULL REFERENCES "{{schema}}"."ShiftPattern"("id") ON DELETE CASCADE,
  "employeeId"  TEXT NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "weekOffset"  INTEGER NOT NULL DEFAULT 0,
  "validFrom"   DATE NOT NULL,
  "validTo"     DATE,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ShiftPatternAssignment_employee_idx"
  ON "{{schema}}"."ShiftPatternAssignment" ("employeeId", "validFrom");

-- ── Asignaciones materializadas (un día × empleado) ────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."ShiftAssignment" (
  "id"                 TEXT PRIMARY KEY,
  "employeeId"         TEXT NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "date"               DATE NOT NULL,
  "startAt"            TIMESTAMP NOT NULL,
  "endAt"              TIMESTAMP NOT NULL,
  "breakMinutes"       INTEGER NOT NULL DEFAULT 0,
  "shiftTemplateId"    TEXT REFERENCES "{{schema}}"."ShiftTemplate"("id") ON DELETE SET NULL,
  "patternId"          TEXT REFERENCES "{{schema}}"."ShiftPattern"("id") ON DELETE SET NULL,
  "status"             TEXT NOT NULL DEFAULT 'scheduled',   -- scheduled | cancelled | substituted
  "substitutedFromId"  TEXT,
  "notes"              TEXT,
  "createdAt"          TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ShiftAssignment_employee_date_idx"
  ON "{{schema}}"."ShiftAssignment" ("employeeId", "date");
CREATE INDEX IF NOT EXISTS "ShiftAssignment_date_idx"
  ON "{{schema}}"."ShiftAssignment" ("date");

-- ── Fichajes ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."TimeclockEntry" (
  "id"          TEXT PRIMARY KEY,
  "employeeId"  TEXT NOT NULL REFERENCES "{{schema}}"."Employee"("id") ON DELETE CASCADE,
  "userId"      TEXT,
  "kind"        TEXT NOT NULL,                  -- in | out | break_start | break_end
  "at"          TIMESTAMP NOT NULL DEFAULT now(),
  "source"      TEXT NOT NULL DEFAULT 'web',    -- web | kiosk | admin
  "latitude"    DECIMAL(9,6),
  "longitude"   DECIMAL(9,6),
  "device"      TEXT,
  "notes"       TEXT
);
CREATE INDEX IF NOT EXISTS "TimeclockEntry_employee_at_idx"
  ON "{{schema}}"."TimeclockEntry" ("employeeId", "at");

-- ── Kioskos físicos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."TimeclockKiosk" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "location"    TEXT,
  "token"       TEXT NOT NULL UNIQUE,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now()
);
