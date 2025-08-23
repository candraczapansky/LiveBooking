// Simple verification script for Helcim initialize endpoint
// Does not modify app code; just performs a POST request and prints the result.

import http from 'http';

const payload = JSON.stringify({ amount: 1.00, description: 'Test from verify script' });

const options = {
	hostname: '127.0.0.1',
	port: 3002,
	path: '/api/payments/helcim/initialize',
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(payload),
	},
	timeout: 10000,
};

const req = http.request(options, (res) => {
	let data = '';
	res.on('data', (chunk) => (data += chunk));
	res.on('end', () => {
		console.log('Status:', res.statusCode);
		try {
			const parsed = JSON.parse(data);
			console.log('Body:', JSON.stringify(parsed, null, 2));
			if (parsed && parsed.success && parsed.token) {
				console.log('✅ Received checkout token:', parsed.token);
				process.exit(0);
			} else {
				console.log('❌ Did not receive expected token.');
				process.exit(2);
			}
		} catch (e) {
			console.log('Raw Body:', data);
			console.error('❌ Failed to parse JSON:', e.message);
			process.exit(3);
		}
	});
});

req.on('error', (err) => {
	console.error('❌ Request error:', err.message);
	process.exit(1);
});

req.on('timeout', () => {
	req.destroy(new Error('Request timed out'));
});

req.write(payload);
req.end();
