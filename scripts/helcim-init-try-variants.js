import fetch from 'node-fetch';

const apiToken = process.env.HELCIM_API_TOKEN || '';
const apiUrlV2 = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';

const base = {
	amount: 1.00,
	currency: 'USD',
	test: true,
	description: 'Variant test',
	idempotencyKey: `hpjs_${Date.now()}_${Math.random().toString(36).slice(2)}`,
};

const variants = [
	{ name: 'paymentType=cc', body: { ...base, paymentType: 'cc' } },
	{ name: 'paymentType=CARD', body: { ...base, paymentType: 'CARD' } },
	{ name: 'paymentType=card', body: { ...base, paymentType: 'card' } },
	{ name: 'paymentType=creditcard', body: { ...base, paymentType: 'creditcard' } },
	{ name: 'paymentType=credit_card', body: { ...base, paymentType: 'credit_card' } },
	{ name: 'paymentType=payment', body: { ...base, paymentType: 'payment' } },
	{ name: 'paymentType=purchase', body: { ...base, paymentType: 'purchase' } },
	{ name: 'paymentType=ach', body: { ...base, paymentType: 'ach' } },
	{ name: 'no paymentType', body: { ...base } },
	{ name: 'transactionType=purchase', body: { ...base, transactionType: 'purchase' } },
];

(async () => {
	console.log('Token set:', !!apiToken);
	for (const v of variants) {
		try {
			console.log(`\n--- Trying variant: ${v.name} ---`);
			const r = await fetch(`${apiUrlV2}/helcim-pay/initialize`, {
				method: 'POST',
				headers: {
					'api-token': apiToken,
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
				body: JSON.stringify(v.body),
			});
			const t = await r.text();
			console.log('Status:', r.status, r.statusText);
			console.log('Body:', t);
			try {
				const j = JSON.parse(t);
				if (j.checkoutToken) {
					console.log('✅ checkoutToken:', j.checkoutToken);
					break;
				}
			} catch {}
		} catch (e) {
			console.error('Error:', e.message);
		}
	}
})();
