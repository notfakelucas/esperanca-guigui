<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$id = isset($_GET['saleId']) ? trim($_GET['saleId']) : '';
if (!$id) {
    http_response_code(400);
    echo json_encode(['status' => 'pending', 'error' => 'saleId obrigatório']);
    exit;
}

$ch = curl_init(XXPAY_BASE . '/payments/' . urlencode($id));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'X-Client-Id: '     . XXPAY_CLIENT_ID,
        'X-Client-Secret: ' . XXPAY_CLIENT_SECRET,
    ],
    CURLOPT_TIMEOUT        => 10,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode < 200 || $httpCode >= 300) {
    echo json_encode(['status' => 'pending']);
    exit;
}

$data = json_decode($response, true);
// XXPay statuses: pending | paid | failed
echo json_encode(['status' => isset($data['status']) ? $data['status'] : 'pending']);
