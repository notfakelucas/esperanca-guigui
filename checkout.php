<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);

$amount    = isset($body['amount'])    ? floatval($body['amount'])                 : null;
$phone     = isset($body['phone'])     ? preg_replace('/\s+/', '', $body['phone']) : '';
$email     = isset($body['email'])     ? trim($body['email'])                      : '';
$nif       = isset($body['nif'])       ? trim($body['nif'])                        : '';
$anon      = isset($body['anonymous']) ? (bool)$body['anonymous']                : true;
$returnUrl = isset($body['return_url']) ? trim($body['return_url'])               : '';

if (!$amount || $amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Valor inválido.']);
    exit;
}

$externalRef = 'revival-' . time() . '-' . substr(md5(uniqid()), 0, 5);

$payload = [
    'amount'             => $amount,
    'currency'           => 'EUR',
    'method'             => 'paypal',
    'description'        => 'Donativo Revival Europa - Associação Cristã',
    'external_reference' => $externalRef,
    'payer'              => [
        'name'    => $anon ? 'Anónimo' : ($nif ?: 'Doador'),
        'country' => 'PT',
    ],
];
if ($phone) {
    $payload['payer']['phone'] = (strpos($phone, '+') === 0) ? $phone : ('+351' . $phone);
}
if ($email && strpos($email, '@') !== false) {
    $payload['payer']['email'] = $email;
}

$callbackUrl = defined('XXPAY_CALLBACK_URL') ? XXPAY_CALLBACK_URL : '';
if ($callbackUrl) {
    $payload['callback_url'] = $callbackUrl;
}

if ($returnUrl) {
    $payload['return_url'] = $returnUrl;
}

$ch = curl_init(XXPAY_BASE . '/payments');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-Client-Id: '     . XXPAY_CLIENT_ID,
        'X-Client-Secret: ' . XXPAY_CLIENT_SECRET,
    ],
    CURLOPT_TIMEOUT        => 15,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro na comunicação com o processador de pagamento.']);
    exit;
}

$data = json_decode($response, true);

if ($httpCode < 200 || $httpCode >= 300) {
    $msg = isset($data['message']) ? $data['message'] : 'Erro ao processar pagamento.';
    echo json_encode(['success' => false, 'message' => $msg]);
    exit;
}

$redirectUrl = isset($data['next_action']['url']) ? $data['next_action']['url'] : null;

echo json_encode([
    'success'     => true,
    'message'     => 'Redirecionando para o PayPal...',
    'saleId'      => $data['id'],
    'redirectUrl' => $redirectUrl,
    'next_action' => isset($data['next_action']) ? $data['next_action'] : null,
]);
