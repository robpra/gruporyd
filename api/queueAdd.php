<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = json_decode(file_get_contents('php://input'), true);

    $member  = $json['member'] ?? null;
    $queue   = $json['queue'] ?? null;
    $penalty = $json['penalty'] ?? null;

    $cmd = "asterisk -rx 'queue add member $member to $queue penalty $penalty' 2>&1";
    $output = shell_exec($cmd);

    echo json_encode([
        "cmd" => $cmd,
        "output" => $output
    ]);
}
?>
