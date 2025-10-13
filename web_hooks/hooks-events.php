<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

$DB_DSN  = "mysql:host=127.0.0.1;dbname=asterisk;charset=utf8mb4";
$DB_USER = "root";        // <-- ajusta
$DB_PASS = "Robert"; // <-- ajusta
$LOG_FALLBACK = "/var/log/asterisk/webhooks.log";

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 200;
if ($limit < 1) $limit = 1;
if ($limit > 1000) $limit = 1000;
$since_id = isset($_GET['since_id']) ? intval($_GET['since_id']) : 0;

try {
  $pdo = new PDO($DB_DSN, $DB_USER, $DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
  ]);

  if ($since_id > 0) {
    $stmt = $pdo->prepare("
      SELECT id, ts, event, direction, from_user, to_user, raw
      FROM call_events
      WHERE id > :since_id
      ORDER BY id DESC
      LIMIT :limit
    ");
    $stmt->bindValue(":since_id", $since_id, PDO::PARAM_INT);
  } else {
    $stmt = $pdo->prepare("
      SELECT id, ts, event, direction, from_user, to_user, raw
      FROM call_events
      ORDER BY id DESC
      LIMIT :limit
    ");
  }
  $stmt->bindValue(":limit", $limit, PDO::PARAM_INT);
  $stmt->execute();
  $rows = $stmt->fetchAll();

  $events = [];
  foreach ($rows as $r) {
    $obj = json_decode($r['raw'], true);
    if (!$obj) $obj = [];
    $events[] = [
      "id" => intval($r['id']),
      "ts_db" => $r['ts'],
      "event" => $r['event'],
      "direction" => $r['direction'],
      "from_user" => $r['from_user'],
      "to_user" => $r['to_user'],
      "payload" => $obj['payload'] ?? null,
      "raw" => $obj ?: $r['raw']
    ];
  }

  echo json_encode(["ok"=>true, "source"=>"db", "count"=>count($events), "items"=>$events], JSON_UNESCAPED_UNICODE);
  exit;

} catch (Throwable $e) {
  if (is_readable($LOG_FALLBACK)) {
    $lines = @file($LOG_FALLBACK, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $lines = array_slice($lines ?: [], -$limit);
    $events = [];
    $id = 0;
    foreach (array_reverse($lines) as $line) {
      if (preg_match('/^\[(.*?)\]\s+(\{.*\})$/', $line, $m)) {
        $ts = $m[1];
        $json = $m[2];
        $obj = json_decode($json, true);
        $events[] = [
          "id" => ++$id,
          "ts_db" => $ts,
          "event" => $obj['event'] ?? "unknown",
          "direction" => $obj['payload']['direction'] ?? null,
          "from_user" => $obj['payload']['from']['uriUser'] ?? null,
          "to_user" => $obj['payload']['to']['uriUser'] ?? null,
          "payload" => $obj['payload'] ?? null,
          "raw" => $obj ?: $json
        ];
      }
    }
    echo json_encode(["ok"=>true, "source"=>"log", "count"=>count($events), "items"=>$events], JSON_UNESCAPED_UNICODE);
  } else {
    http_response_code(500);
    echo json_encode(["ok"=>false, "error"=>$e->getMessage(), "hint"=>"DB y log fallback no disponibles"]);
  }
}
