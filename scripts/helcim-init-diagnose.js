import fetch from 'node-fetch';

(async () => {
	try {
		const apiToken = process.env.HELCIM_API_TOKEN || '';
		const apiUrlV2 = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
		const payload = {
			amount: 1.00,
			currency: 'USD',
			paymentType: 'cc',
			test: true,
			description: 'Diagnose init',
			idempotencyKey: `hpjs_${Date.now()}_${Math.random().toString(36).slice(2)}`,
		};

		console.log('Token set:', apiToken ? 'YES' : 'NO');

		console.log('\n--- Trying V2 /helcim-pay/initialize ---');
		const r2 = await fetch(`${apiUrlV2}/helcim-pay/initialize`, {
			method: 'POST',
			headers: {
				'api-token': apiToken,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify(payload),
		});
		const t2 = await r2.text();
		console.log('Status:', r2.status, r2.statusText);
		console.log('Body:', t2);

		console.log('\n--- Trying V1 /helcim-pay/initialize ---');
		const r1 = await fetch(`https://api.helcim.com/v1/helcim-pay/initialize`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify(payload),
		});
		const t1 = await r1.text();
		console.log('Status:', r1.status, r1.statusText);
		console.log('Body:', t1);
	} catch (e) {
		console.error('Error during diagnose:', e);
		process.exit(1);
	}
})();
