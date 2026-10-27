module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  // XXPay posts payment status updates here — acknowledge receipt
  res.status(200).json({ received: true });
};
