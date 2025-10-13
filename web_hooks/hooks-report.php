<?php
/**
 * hooks-report.php
 * Lightweight read-only API for dashboard widgets.
 * Place in your Issabel docroot (e.g., /var/www/html/hooks-report.php).
 * Optionally protect with auth or network ACLs.
 */

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

$DB_DSN  = "mysql:host=127.0.0.1;dbname=asterisk;charset=utf8mb4";
$DB_USER = "root";       // <-- adjust
$DB_PASS = "Robert"; // <-- adjust

$period = isset($_GET['period']) ? $_GET['period'] : '24h'; // 24h | 7d | 30d
$range_clause = "NOW() - INTERVAL 24 HOUR";
if ($period === '7d')  $range_clause = "NOW() - INTERVAL 7 DAY";
if ($period === '30d') $range_clause = "NOW() - INTERVAL 30 DAY";

try {
  $pdo = new PDO($DB_DSN, $DB_USER, $DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
  ]);

  // KPIs (finished calls only for duration)
  $kpi = $pdo->query("
    SELECT
      COUNT(*)                                         AS calls_total,
      SUM(duration_sec IS NULL)                        AS calls_in_progress,
      SUM(duration_sec IS NOT NULL)                    AS calls_finished,
      SEC_TO_TIME(AVG(duration_sec))                   AS avg_duration,
      SEC_TO_TIME(SUM(duration_sec))                   AS total_talk_time
    FROM v_call_sessions
    WHERE start_ts >= $range_clause
  ")->fetch();

  // Top agents by volume
  $top_agents = $pdo->query("
    SELECT agent_ext, COUNT(*) AS calls
    FROM v_call_sessions
    WHERE start_ts >= $range_clause
    GROUP BY agent_ext
    ORDER BY calls DESC
    LIMIT 10
  ")->fetchAll();

  // Hourly buckets (last 24h always)
  $hourly = $pdo->query("
    SELECT * FROM v_calls_last24h_by_hour
  ")->fetchAll();

  // Recent calls table (last 100)
  $recent = $pdo->query("
    SELECT call_id, agent_ext, remote_ext, direction, start_ts, end_ts,
           SEC_TO_TIME(duration_sec) AS duration
    FROM v_call_sessions
    WHERE start_ts >= $range_clause
    ORDER BY start_ts DESC
    LIMIT 100
  ")->fetchAll();

  echo json_encode([
    "ok" => true,
    "period" => $period,
    "kpi" => $kpi,
    "top_agents" => $top_agents,
    "hourly" => $hourly,
    "recent" => $recent
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["ok"=>false, "error"=>$e->getMessage()]);
}
