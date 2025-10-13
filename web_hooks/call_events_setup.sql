
-- call_events_setup.sql
-- Schema + views for webhook-based call analytics on Issabel/FreePBX
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE where available).

CREATE DATABASE IF NOT EXISTS asterisk
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE asterisk;

-- Base table for events (inserted by hooks.php)
CREATE TABLE IF NOT EXISTS call_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  call_id VARCHAR(128) NULL,
  event   VARCHAR(64)  NOT NULL,
  ts      DATETIME     NOT NULL,
  direction   VARCHAR(16) NULL,
  from_user   VARCHAR(64) NULL,
  to_user     VARCHAR(64) NULL,
  raw JSON NOT NULL,
  KEY idx_callid (call_id),
  KEY idx_event_ts (event, ts),
  KEY idx_from_ts (from_user, ts),
  KEY idx_to_ts   (to_user, ts),
  KEY idx_ts (ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Convenience view (normalizes agent vs remote per direction)
DROP VIEW IF EXISTS v_call_events;
CREATE VIEW v_call_events AS
SELECT
  id,
  call_id,
  event,
  ts,
  direction,
  CASE WHEN direction='outbound' THEN from_user
       WHEN direction='inbound'  THEN to_user
       ELSE NULL END AS agent_ext,
  CASE WHEN direction='outbound' THEN to_user
       WHEN direction='inbound'  THEN from_user
       ELSE NULL END AS remote_ext,
  raw
FROM call_events;

-- One row per call session (start/end/duration/participants)
DROP VIEW IF EXISTS v_call_sessions;
CREATE VIEW v_call_sessions AS
SELECT
  ce.call_id,
  MIN(ce.ts) AS start_ts,
  MAX(CASE WHEN ce.event='call.terminated' THEN ce.ts END) AS end_ts,
  ANY_VALUE(ce.direction) AS direction,
  SUBSTRING_INDEX(
    GROUP_CONCAT(CASE WHEN ce.agent_ext  IS NOT NULL THEN ce.agent_ext  END ORDER BY ce.ts SEPARATOR ','),
    ',', 1
  ) AS agent_ext,
  SUBSTRING_INDEX(
    GROUP_CONCAT(CASE WHEN ce.remote_ext IS NOT NULL THEN ce.remote_ext END ORDER BY ce.ts SEPARATOR ','),
    ',', 1
  ) AS remote_ext,
  CASE
    WHEN MAX(ce.event='call.terminated') = 1
    THEN TIMESTAMPDIFF(SECOND, MIN(ce.ts), MAX(CASE WHEN ce.event='call.terminated' THEN ce.ts END))
    ELSE NULL
  END AS duration_sec
FROM v_call_events ce
GROUP BY ce.call_id;

-- Finished calls only
DROP VIEW IF EXISTS v_calls_finished;
CREATE VIEW v_calls_finished AS
SELECT * FROM v_call_sessions WHERE end_ts IS NOT NULL;

-- Missed calls (if client emits call.missed)
DROP VIEW IF EXISTS v_calls_missed;
CREATE VIEW v_calls_missed AS
SELECT
  ce.id, ce.ts, ce.call_id, ce.direction, ce.agent_ext, ce.remote_ext, ce.raw
FROM v_call_events ce
WHERE ce.event='call.missed';

-- DTMF log
DROP VIEW IF EXISTS v_call_dtmf;
CREATE VIEW v_call_dtmf AS
SELECT
  ce.ts, ce.call_id, ce.agent_ext, ce.remote_ext,
  JSON_UNQUOTE(JSON_EXTRACT(ce.raw, '$.payload.tone')) AS tone
FROM v_call_events ce
WHERE ce.event='call.dtmf';

-- Agent last status (registered/unregistered)
DROP VIEW IF EXISTS v_agents_last_status;
CREATE VIEW v_agents_last_status AS
SELECT agent, 
       SUBSTRING_INDEX(ev, '|', 1)  AS last_event,
       CAST(SUBSTRING_INDEX(ev, '|', -1) AS DATETIME) AS last_ts
FROM (
  SELECT
    CASE WHEN direction='outbound' THEN from_user
         WHEN direction='inbound'  THEN to_user
         ELSE NULL END AS agent,
    SUBSTRING_INDEX(
      GROUP_CONCAT(
        CASE WHEN event IN ('ua.registered','ua.unregistered')
          THEN CONCAT(event,'|',ts) END
        ORDER BY ts DESC SEPARATOR ','
      ), ',', 1
    ) AS ev
  FROM v_call_events
  GROUP BY agent
) s;

-- Convenience view: hourly buckets last 24h
DROP VIEW IF EXISTS v_calls_last24h_by_hour;
CREATE VIEW v_calls_last24h_by_hour AS
SELECT
  DATE_FORMAT(start_ts, '%Y-%m-%d %H:00:00') AS hour_bucket,
  COUNT(*) AS calls
FROM v_call_sessions
WHERE start_ts >= NOW() - INTERVAL 24 HOUR
GROUP BY hour_bucket
ORDER BY hour_bucket;




USE asterisk;

-- Reemplazo de v_call_sessions sin ANY_VALUE()
DROP VIEW IF EXISTS v_call_sessions;
CREATE VIEW v_call_sessions AS
SELECT
  ce.call_id,
  MIN(ce.ts) AS start_ts,
  MAX(CASE WHEN ce.event='call.terminated' THEN ce.ts END) AS end_ts,

  -- tomar la primera dirección observada por orden de tiempo
  SUBSTRING_INDEX(
    GROUP_CONCAT(ce.direction ORDER BY ce.ts SEPARATOR ','),
    ',', 1
  ) AS direction,

  -- primer agente observado según la normalización de v_call_events
  SUBSTRING_INDEX(
    GROUP_CONCAT(CASE WHEN ce.agent_ext  IS NOT NULL THEN ce.agent_ext  END ORDER BY ce.ts SEPARATOR ','),
    ',', 1
  ) AS agent_ext,

  -- primer remoto observado
  SUBSTRING_INDEX(
    GROUP_CONCAT(CASE WHEN ce.remote_ext IS NOT NULL THEN ce.remote_ext END ORDER BY ce.ts SEPARATOR ','),
    ',', 1
  ) AS remote_ext,

  CASE
    WHEN MAX(ce.event='call.terminated') = 1
    THEN TIMESTAMPDIFF(SECOND, MIN(ce.ts), MAX(CASE WHEN ce.event='call.terminated' THEN ce.ts END))
    ELSE NULL
  END AS duration_sec
FROM v_call_events ce
GROUP BY ce.call_id;

-- (Re)crear las vistas derivadas por si fallaron antes

DROP VIEW IF EXISTS v_calls_finished;
CREATE VIEW v_calls_finished AS
SELECT * FROM v_call_sessions WHERE end_ts IS NOT NULL;

DROP VIEW IF EXISTS v_calls_missed;
CREATE VIEW v_calls_missed AS
SELECT
  ce.id, ce.ts, ce.call_id, ce.direction, ce.agent_ext, ce.remote_ext, ce.raw
FROM v_call_events ce
WHERE ce.event='call.missed';

DROP VIEW IF EXISTS v_call_dtmf;
CREATE VIEW v_call_dtmf AS
SELECT
  ce.ts, ce.call_id, ce.agent_ext, ce.remote_ext,
  JSON_UNQUOTE(JSON_EXTRACT(ce.raw, '$.payload.tone')) AS tone
FROM v_call_events ce
WHERE ce.event='call.dtmf';

DROP VIEW IF EXISTS v_agents_last_status;
CREATE VIEW v_agents_last_status AS
SELECT agent, 
       SUBSTRING_INDEX(ev, '|', 1)  AS last_event,
       CAST(SUBSTRING_INDEX(ev, '|', -1) AS DATETIME) AS last_ts
FROM (
  SELECT
    CASE WHEN direction='outbound' THEN from_user
         WHEN direction='inbound'  THEN to_user
         ELSE NULL END AS agent,
    SUBSTRING_INDEX(
      GROUP_CONCAT(
        CASE WHEN event IN ('ua.registered','ua.unregistered')
          THEN CONCAT(event,'|',ts) END
        ORDER BY ts DESC SEPARATOR ','
      ), ',', 1
    ) AS ev
  FROM v_call_events
  GROUP BY agent
) s;

DROP VIEW IF EXISTS v_calls_last24h_by_hour;
CREATE VIEW v_calls_last24h_by_hour AS
SELECT
  DATE_FORMAT(start_ts, '%Y-%m-%d %H:00:00') AS hour_bucket,
  COUNT(*) AS calls
FROM v_call_sessions
WHERE start_ts >= NOW() - INTERVAL 24 HOUR
GROUP BY hour_bucket
ORDER BY hour_bucket;

