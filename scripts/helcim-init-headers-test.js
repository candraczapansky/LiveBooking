import fetch from 'node-fetch';

const apiToken = process.env.HELCIM_API_TOKEN || '';
const apiUrlV2 = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';

const payload = {
	amount: 1.00,
	currency: 'USD',
	test: true,
	description: 'Header test',
	idempotencyKey: `hpjs_${Date.now()}_${Math.random().toString(36).slice(2)}`,
};

(async () => {
	console.log('Token present:', !!apiToken);
	console.log('\n--- V2 with api-token header ---');
	try {
		const r = await fetch(`${apiUrlV2}/helcim-pay/initialize`, {
			method: 'POST',
			headers: {
				'api-token': apiToken,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify(payload),
		});
		const t = await r.text();
		console.log('Status:', r.status, r.statusText);
		console.log('Body:', t);
	} catch (e) {
		console.error('Error (api-token):', e.message);
	}

	console.log('\n--- V2 with Authorization: Bearer header ---');
	try {
		const r = await fetch(`${apiUrlV2}/helcim-pay/initialize`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify(payload),
		});
		const t = await r.text();
		console.log('Status:', r.status, r.statusText);
		console.log('Body:', t);
	} catch (e) {
		console.error('Error (Bearer):', e.message);
	}
})();
