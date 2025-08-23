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
	{ name: 'paymentType=card', body: { ...base, paymentType: 'card' } },
	{ name: 'no paymentType', body: { ...base } },
	{ name: 'paymentMethod=card', body: { ...base, paymentMethod: 'card' } },
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
