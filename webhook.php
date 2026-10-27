<?php
// XXPay posts payment status updates here — acknowledge receipt
http_response_code(200);
header('Content-Type: application/json');
echo json_encode(['received' => true]);
