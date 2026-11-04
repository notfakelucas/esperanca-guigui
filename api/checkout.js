const XXPAY_BASE = 'https://api.xxpayconnect.com/api/v1/public';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const clientId = process.env.XXPAY_CLIENT_ID || 'xxc_tonmjbuod84pe5x43mnaazla7thk';
  const clientSecret = process.env.XXPAY_CLIENT_SECRET || 'xxs_FzHZNUv6B5EDX7uyc4z3i4e1CAYisphIgUTLUfx3';

  if (!clientId || !clientSecret) {
    console.error('[checkout] Missing XXPAY credentials');
    return res.status(500).json({ success: false, message: 'Erro de configuração do servidor.' });
  }

  const { amount, phone, nif, email, method = 'paypal', anonymous, return_url } = req.body || {};

  if (!amount || isNaN(parseFloat(amount))) {
    return res.status(400).json({ success: false, message: 'Valor inválido.' });
  }

  const cleanPhone = phone ? phone.replace(/\s+/g, '') : '';
  const externalRef = `revival-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const body = {
    amount: parseFloat(amount),
    currency: 'EUR',
    method: 'paypal',
    description: 'Donativo Revival Europa - Associação Cristã',
    external_reference: externalRef,
    payer: {
      name: anonymous ? 'Anónimo' : (nif || 'Doador'),
      country: 'PT',
    },
  };

  if (cleanPhone) {
    body.payer.phone = cleanPhone.startsWith('+') ? cleanPhone : `+351${cleanPhone}`;
  }

  if (email && email.includes('@')) {
    body.payer.email = email;
  }

  const origin = req.headers['origin'] || (req.headers['referer'] ? new URL(req.headers['referer']).origin : 'https://aviva-europa-guigui.vercel.app');
  const callbackUrl = process.env.XXPAY_CALLBACK_URL || `${origin}/api/webhook`;
  body.callback_url = callbackUrl;
  body.return_url = return_url || `${origin}/obrigado.html?amount=${amount}&method=paypal`;

  try {
    const xxpayRes = await fetch(`${XXPAY_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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

    const redirectUrl = (data.next_action && data.next_action.url) || null;

    return res.status(200).json({
      success: true,
      message: 'Redirecionando para o PayPal...',
      saleId: data.id,
      redirectUrl: redirectUrl,
      next_action: data.next_action,
    });
  } catch (err) {
    console.error('[checkout] fetch error:', err);
    return res.status(500).json({ success: false, message: 'Erro na comunicação com o processador de pagamento.' });
  }
};
