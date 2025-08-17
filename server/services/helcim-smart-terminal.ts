import fetch from 'node-fetch';

export interface HelcimPurchaseRequest {
	code: string;
	currency: 'USD' | 'CAD';
	transactionAmount: number; // decimal dollars
	idempotencyKey: string;
	invoiceNumber?: string;
	customerCode?: string;
}

export interface HelcimRefundRequest {
	code: string;
	currency: 'USD' | 'CAD';
	transactionAmount: number; // decimal dollars
	originalTransactionId: string | number;
	idempotencyKey: string;
}

export class HelcimSmartTerminalService {
	private apiUrl: string;
	private apiToken: string;

	constructor(apiToken: string, apiUrl: string = 'https://api.helcim.com/v2/smart-terminal') {
		if (!apiToken) throw new Error('HELCIM_API_TOKEN must be set');
		this.apiToken = apiToken;
		this.apiUrl = apiUrl.replace(/\/$/, '');
	}

	private async request(path: string, init: any = {}) {
		const url = `${this.apiUrl}${path}`;
		const headers: Record<string, string> = {
			accept: 'application/json',
			'content-type': 'application/json',
			'api-token': this.apiToken,
			...(init.headers || {})
		};

		// Lightweight debug logging without sensitive values
		try {
			const safeHeaders = { ...(headers as any) } as Record<string, string>;
			if (safeHeaders['api-token']) {
				// mask the token while keeping format hints for easier troubleshooting
				safeHeaders['api-token'] = `${safeHeaders['api-token'].slice(0, 4)}***`;
			}
			const bodyPreview = typeof init.body === 'string' ? init.body.slice(0, 200) : init.body;
			console.log(`📤 Helcim request ${init.method || 'GET'} ${url}`, {
				headers: safeHeaders,
				body: bodyPreview
			});
		} catch {}

		const response = await fetch(url, { ...init, headers });
		const contentType = response.headers.get('content-type') || '';
		let body: any = null;
		try {
			if (contentType.includes('application/json')) {
				body = await response.json();
			} else {
				body = await response.text();
			}
		} catch {
			// ignore body parse
		}
		try {
			console.log(`📥 Helcim response ${response.status} ${url}`, {
				ok: response.ok,
				contentType,
				body: typeof body === 'string' ? body.slice(0, 400) : body
			});
		} catch {}
		return { ok: response.ok, status: response.status, body };
	}

	async getDevices() {
		return this.request('/devices', { method: 'GET' });
	}

	async pingDevice(code: string, idempotencyKey?: string) {
		// Primary endpoint (may not exist on some API versions)
		const primary = await this.request(`/devices/${encodeURIComponent(code)}/events/ping`, {
			method: 'POST',
			headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
			body: JSON.stringify({})
		});
		if (primary.ok || (primary.status >= 200 && primary.status < 300)) return primary;
		// Fallback endpoint attempt
		const fallback = await this.request(`/devices/${encodeURIComponent(code)}/ping`, {
			method: 'POST',
			headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
			body: JSON.stringify({})
		});
		return fallback;
	}

	async startPurchase(req: HelcimPurchaseRequest) {
		const { code, currency, transactionAmount, idempotencyKey, invoiceNumber, customerCode } = req;
		// Ensure amount is a number with max 2 decimals
		const normalizedAmount = Math.round(Number(transactionAmount) * 100) / 100;
		const body: any = { currency, transactionAmount: normalizedAmount };
		
		if (invoiceNumber) body.invoiceNumber = invoiceNumber;
		if (customerCode) body.customerCode = customerCode;
		
		const response = await this.request(`/devices/${encodeURIComponent(code)}/payment/purchase`, {
			method: 'POST',
			headers: { 'idempotency-key': idempotencyKey },
			body: JSON.stringify(body)
		});
		
		if (!response.ok) {
			if (response.status === 401) {
				throw new Error('Invalid Helcim API token. Please check your configuration.');
			}
			if (response.status === 404) {
				throw new Error('Device not found or API endpoint incorrect. Please verify your Helcim configuration.');
			}
			if (response.status === 409) {
				throw new Error('Device conflict: Device may be offline, sleeping, or processing another transaction');
			}
			
			const errorMessage = response.body?.errors?.[0] || response.body?.message || `HTTP ${response.status}`;
			throw new Error(`Helcim API error: ${errorMessage}`);
		}
		
		return response;
	}

	async startRefund(req: HelcimRefundRequest) {
		const { code, currency, transactionAmount, originalTransactionId, idempotencyKey } = req;
		const body: any = { currency, transactionAmount, originalTransactionId };
		return this.request(`/devices/${encodeURIComponent(code)}/payment/refund`, {
			method: 'POST',
			headers: { 'idempotency-key': idempotencyKey },
			body: JSON.stringify(body)
		});
	}

	async getCardTransactionById(cardTransactionId: string | number) {
		return this.request(`/card-transactions/${cardTransactionId}`, { method: 'GET' });
	}
}

export function generateIdempotencyKey(prefix: string = 'helcim'): string {
	const base = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
	return base.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
}



