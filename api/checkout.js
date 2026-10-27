const XXPAY_BASE = 'https://api.xxpayconnect.com/api/v1/public';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const clientId = process.env.XXPAY_CLIENT_ID;
  const clientSecret = process.env.XXPAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[checkout] Missing XXPAY credentials');
    return res.status(500).json({ success: false, message: 'Erro de configuração do servidor.' });
  }

  const { amount, phone, nif, email, method = 'mbway', anonymous } = req.body || {};

  if (!amount || isNaN(parseFloat(amount))) {
    return res.status(400).json({ success: false, message: 'Valor inválido.' });
  }
  if (!phone || !/^9\d{8}$/.test(phone.replace(/\s+/g, ''))) {
    return res.status(400).json({ success: false, message: 'Número de telemóvel inválido.' });
  }

  const cleanPhone = phone.replace(/\s+/g, '');
  const externalRef = `espe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const body = {
    amount: parseFloat(amount),
    currency: 'EUR',
    method: method === 'mbway' ? 'mbway' : method,
    description: 'Donativo Instituto Esperança',
    external_reference: externalRef,
    payer: {
      name: anonymous ? 'Anónimo' : (nif || 'Doador'),
      phone: `+351${cleanPhone}`,
      country: 'PT',
    },
  };

  if (email && email.includes('@')) body.payer.email = email;

  const callbackUrl = process.env.XXPAY_CALLBACK_URL || 'https://esperanca-guigui.vercel.app/api/webhook';
  body.callback_url = callbackUrl;

  try {
    const xxpayRes = await fetch(`${XXPAY_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': clientId,
        'X-Client-Secret': clientSecret,
      },
      body: JSON.stringify(body),
    });

    const data = await xxpayRes.json();

    if (!xxpayRes.ok) {
      const msg = data.message || data.error || 'Erro ao processar pagamento.';
      console.error('[checkout] XXPay error:', xxpayRes.status, msg);
      return res.status(200).json({ success: false, message: msg });
    }

    return res.status(200).json({
      success: true,
      message: 'Verifica a tua app MB WAY e aprova o donativo.',
      saleId: data.id,
    });
  } catch (err) {
    console.error('[checkout] fetch error:', err);
    return res.status(500).json({ success: false, message: 'Erro na comunicação com o processador de pagamento.' });
  }
};
