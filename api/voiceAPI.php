<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path==='/api/queues/add') {
    $member = $_POST['member'];
    $queue  = $_POST['queue'];
    $penalty = $_POST['penalty'];

	// queue add member SIP/3150 to 6321 penalty 1
    $cmd = "asterisk -rx 'queue add member $member to $queue penalty $penalty' 2>&1";
    $output = shell_exec($cmd);

    echo json_encode([
        "cmd" => $cmd,
        "output" => $output
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path==='/api/queues/remove') {
    $member = $_POST['member'];
    $queue  = $_POST['queue'];

    $cmd = "asterisk -rx 'queue remove member $member from $queue' 2>&1";
    $output = shell_exec($cmd);

    echo json_encode([
        "cmd" => $cmd,
        "output" => $output
    ]);
}

.
if ($_SERVER['REQUEST_METHOD']==='GET' && $path==='/api/queues/status') {
  $auth = require_auth();
  $q = $_GET['queue'] ?? 'default_queue';
  // valores dummy
  json_out([
    'queue'=>$q,
    'agentsLogged'=>1,
    'callsWaiting'=>0,
    'lastUpdate'=>date(DATE_ATOM),
  ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path === '/queue/pause') {
  $j = json_decode(file_get_contents('php://input'), true);
  $queue  = $j['queue']  ?? '';
  $member = $j['member'] ?? '';
  $cmd = sprintf("asterisk -rx 'queue add member %s to %s' 2>&1",
                 escapeshellarg($member), escapeshellarg($queue));
  $out = shell_exec($cmd);
  json_out(['ok'=>true,'cmd'=>$cmd,'output'=>$out]);
}
// Si nada coincide ? 404 JSON
json_out(['error'=>true,'message'=>'Not found','path'=>$path], 404);

