import type { Express, Request, Response } from 'express';
import crypto from 'crypto';
import { HelcimSmartTerminalService, generateIdempotencyKey } from '../services/helcim-smart-terminal';
import type { IStorage } from '../storage';

function verifyHelcimSignature(req: Request, webhookSecretBase64: string): boolean {
	try {
		const signatureHeader = req.header('webhook-signature') || '';
		const timestamp = req.header('webhook-timestamp') || '';
		const id = req.header('webhook-id') || '';
		if (!signatureHeader || !timestamp || !id) return false;

		const signedContent = `${id}.${timestamp}.${JSON.stringify(req.body)}`;
		const key = Buffer.from(webhookSecretBase64, 'base64');
		const computed = crypto.createHmac('sha256', key).update(signedContent).digest('base64');
		// signature header can contain multiple versions e.g. v1,<sig> v2,<sig>
		return signatureHeader.split(/\s+/).some(part => part.split(',')[1] === computed);
	} catch {
		return false;
	}
}

export function registerHelcimRoutes(app: Express, storage: IStorage) {
	const apiToken = process.env.HELCIM_API_TOKEN || '';
	const webhookSecret = process.env.HELCIM_WEBHOOK_SECRET || '';
	const defaultDeviceCode = process.env.HELCIM_TERMINAL_DEVICE_CODE || '';
	const defaultCurrency = (process.env.HELCIM_CURRENCY || 'USD').toUpperCase() as 'USD' | 'CAD';
	const helcimApiUrl = (process.env.HELCIM_API_URL || 'https://api.helcim.com/v2').replace(/\/$/, '');

	let helcim: HelcimSmartTerminalService | null = null;
	try {
		if (apiToken) {
			helcim = new HelcimSmartTerminalService(apiToken, helcimApiUrl);
			console.log('🔧 HelcimSmartTerminalService initialized with:', {
				apiUrl: helcimApiUrl,
				apiToken: apiToken ? 'SET' : 'MISSING',
				webhookSecret: webhookSecret ? 'SET' : 'MISSING',
				defaultDeviceCode: defaultDeviceCode || '(none)',
				defaultCurrency
			});
		}
	} catch {
		helcim = null;
	}

	// List devices (debug)
	app.get('/api/helcim-smart-terminal/devices', async (_req: Request, res: Response) => {
		if (!helcim) return res.status(500).json({ error: 'Helcim not configured' });
		const result = await helcim.getDevices();
		res.status(result.ok ? 200 : result.status).json({ success: result.ok, ...result.body });
	});

	// Health check
	app.get('/api/helcim-smart-terminal/health', (_req: Request, res: Response) => {
		return res.json({ ok: true, configured: !!helcim, defaultCurrency, defaultDeviceCode: defaultDeviceCode || null });
	});

	// Optional: ping device to validate pairing
	app.post('/api/helcim-smart-terminal/devices/:code/check-readiness', async (req: Request, res: Response) => {
		if (!helcim) return res.status(500).json({ error: 'Helcim not configured' });
		const code = req.params.code || defaultDeviceCode;
		const idk = generateIdempotencyKey('ping');
		const result = await helcim.pingDevice(code, idk);
		res.status(result.ok ? 200 : result.status).json({ success: result.ok, ...result.body });
	});

	// Start a purchase to smart terminal
	app.post('/api/helcim-smart-terminal/devices/:code/purchase', async (req: Request, res: Response) => {
		try {
			if (!helcim) return res.status(500).json({ error: 'Helcim not configured' });
			const code = req.params.code || defaultDeviceCode;
			const { amount, currency, invoiceNumber, customerCode, appointmentId, clientId } = req.body || {};
			if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
			const idk = generateIdempotencyKey('purchase');
			const inv = invoiceNumber || (appointmentId ? `APT-${appointmentId}` : undefined);
			const cust = customerCode || (clientId ? `CLIENT-${clientId}` : undefined);
			const selectedCurrency = ((currency || defaultCurrency) as 'USD' | 'CAD');
			const result = await helcim.startPurchase({ code, currency: selectedCurrency, transactionAmount: amount, idempotencyKey: idk, invoiceNumber: inv, customerCode: cust });
			// 202 Accepted expected; we can persist a pending payment if desired
			if (result.ok && appointmentId && clientId) {
				await storage.createPayment({
					appointmentId,
					clientId,
					amount,
					tipAmount: 0,
					totalAmount: amount,
					method: 'helcim_terminal',
					status: 'pending',
					type: 'appointment',
					description: 'Helcim Smart Terminal purchase (pending)'
				});
			}
			return res.status(result.status).json({ success: result.ok, ...result.body });
		} catch (err: any) {
			return res.status(500).json({ error: err.message || 'Failed to start Helcim purchase' });
		}
	});

	// Start a debit refund to smart terminal
	app.post('/api/helcim-smart-terminal/devices/:code/refund', async (req: Request, res: Response) => {
		try {
			if (!helcim) return res.status(500).json({ error: 'Helcim not configured' });
			const code = req.params.code || defaultDeviceCode;
			const { amount, currency = 'USD', originalTransactionId } = req.body || {};
			if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
			if (!originalTransactionId) return res.status(400).json({ error: 'originalTransactionId required' });
			const idk = generateIdempotencyKey('refund');
			const result = await helcim.startRefund({ code, currency, transactionAmount: amount, originalTransactionId, idempotencyKey: idk });
			return res.status(result.status).json({ success: result.ok, ...result.body });
		} catch (err: any) {
			return res.status(500).json({ error: err.message || 'Failed to start Helcim refund' });
		}
	});

	// Alias routes for compatibility (some deployments might use shorter base path)
	app.post('/api/helcim/devices/:code/check-readiness', async (req: Request, res: Response) => {
		if (!helcim) return res.status(500).json({ error: 'Helcim not configured' });
		const code = req.params.code || defaultDeviceCode;
		const idk = generateIdempotencyKey('ping');
		const result = await helcim.pingDevice(code, idk);
		res.status(result.ok ? 200 : result.status).json({ success: result.ok, ...result.body });
	});

	app.post('/api/helcim/devices/:code/purchase', async (req: Request, res: Response) => {
		try {
			if (!helcim) return res.status(500).json({ error: 'Helcim not configured' });
			const code = req.params.code || defaultDeviceCode;
			const { amount, currency, invoiceNumber, customerCode, appointmentId, clientId } = req.body || {};
			if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
			const idk = generateIdempotencyKey('purchase');
			const inv = invoiceNumber || (appointmentId ? `APT-${appointmentId}` : undefined);
			const cust = customerCode || (clientId ? `CLIENT-${clientId}` : undefined);
			const selectedCurrency = ((currency || defaultCurrency) as 'USD' | 'CAD');
			const result = await helcim.startPurchase({ code, currency: selectedCurrency, transactionAmount: amount, idempotencyKey: idk, invoiceNumber: inv, customerCode: cust });
			if (result.ok && appointmentId && clientId) {
				await storage.createPayment({
					appointmentId,
					clientId,
					amount,
					tipAmount: 0,
					totalAmount: amount,
					method: 'helcim_terminal',
					status: 'pending',
					type: 'appointment',
					description: 'Helcim Smart Terminal purchase (pending)'
				});
			}
			return res.status(result.status).json({ success: result.ok, ...result.body });
		} catch (err: any) {
			return res.status(500).json({ error: err.message || 'Failed to start Helcim purchase' });
		}
	});

	// Webhook endpoint: configure Deliver URL in Helcim dashboard to this path
	// IMPORTANT: do not protect with CSRF; ensure HTTPS in production

	// Tolerant body-parser error handler for webhook paths (prevents 400 on empty/invalid JSON bodies)
	app.use('/api/helcim-smart-terminal/webhook', (err: any, _req: Request, res: Response, next: Function) => {
		try {
			if (err && (err.type === 'entity.parse.failed' || err.statusCode === 400)) {
				return res.status(200).json({ received: true, note: 'tolerated invalid json' });
			}
		} catch {}
		return next(err);
	});
	app.use('/helcim-smart-terminal/webhook', (err: any, _req: Request, res: Response, next: Function) => {
		try {
			if (err && (err.type === 'entity.parse.failed' || err.statusCode === 400)) {
				return res.status(200).json({ received: true, note: 'tolerated invalid json' });
			}
		} catch {}
		return next(err);
	});
	app.use('/api/webhooks/helcim', (err: any, _req: Request, res: Response, next: Function) => {
		try {
			if (err && (err.type === 'entity.parse.failed' || err.statusCode === 400)) {
				return res.status(200).json({ received: true, note: 'tolerated invalid json' });
			}
		} catch {}
		return next(err);
	});
	app.use('/h/webhook', (err: any, _req: Request, res: Response, next: Function) => {
		try {
			if (err && (err.type === 'entity.parse.failed' || err.statusCode === 400)) {
				return res.status(200).json({ received: true, note: 'tolerated invalid json' });
			}
		} catch {}
		return next(err);
	});

	// Health/probe routes to satisfy provider validation
	app.get('/api/helcim-smart-terminal/webhook', async (_req: Request, res: Response) => {
		return res.status(200).json({ ok: true });
	});

	app.head('/api/helcim-smart-terminal/webhook', async (_req: Request, res: Response) => {
		return res.sendStatus(200);
	});

	app.post('/api/helcim-smart-terminal/webhook', async (req: Request, res: Response) => {
		try {
			console.log('📥 Helcim webhook received:', {
				headers: {
					signature: req.header('webhook-signature'),
					timestamp: req.header('webhook-timestamp'),
					id: req.header('webhook-id')
				},
				body: req.body
			});

			// For development/testing, allow webhook processing without signature verification
			if (process.env.NODE_ENV !== 'production') {
				console.log('🔧 Development mode - skipping signature verification');
			} else {
				// Graceful handshake: acknowledge without processing if secret missing or signature invalid
				if (!webhookSecret) {
					console.log('⚠️ Webhook secret not configured');
					return res.status(200).json({ received: true, note: 'webhook secret not configured (no-op)' });
				}
				const valid = verifyHelcimSignature(req, webhookSecret);
				if (!valid) {
					console.log('⚠️ Invalid webhook signature');
					return res.status(200).json({ received: true, note: 'invalid signature (no-op)' });
				}
			}

			// Body example: { id: '25764674', type: 'cardTransaction', status: 'COMPLETED', transactionAmount: 2.00, invoiceNumber: 'APT-372' }
			console.log('🔍 Analyzing webhook body:', req.body);
			const { id, type, status, transactionId, transactionAmount, invoiceNumber: webhookInvoiceNumber } = req.body || {};
			
			// Accept both direct transaction events and cardTransaction events
			if ((type === 'cardTransaction' || type === 'transaction') && (id || transactionId)) {
				const txId = id || transactionId;
				console.log('💳 Processing transaction:', txId);
				
				// Use amount and invoice number directly from webhook if available
				let amount = transactionAmount ? parseFloat(String(transactionAmount)) : 0;
				let invoiceNumber = webhookInvoiceNumber;
				let txStatus = status ? String(status).toUpperCase() : '';
				
				console.log('💳 Initial transaction details:', { amount, txStatus, invoiceNumber });
				
				// Skip API fetch if we have all details
				if (amount && invoiceNumber && txStatus) {
					console.log('✨ Using webhook details:', { amount, txStatus, invoiceNumber });
				} else {
					console.log('⚠️ Missing critical details:', { amount, txStatus, invoiceNumber });
					return res.status(200).json({ received: true, note: 'missing transaction details' });
				}
				
				const approved = txStatus.includes('APPROVED') || txStatus === 'SUCCESS' || txStatus === 'COMPLETED';
				console.log('💳 Final transaction details:', { amount, txStatus, approved, invoiceNumber });
				
				if (!approved) {
					console.log('⚠️ Transaction not approved:', txStatus);
					return res.status(200).json({ received: true, note: 'transaction not approved' });
				}
				
				// Extract appointment ID from invoice number
				let appointmentId: number | undefined = undefined;
				if (invoiceNumber && invoiceNumber.startsWith('APT-')) {
					const idStr = invoiceNumber.split('APT-')[1];
					const parsed = parseInt(idStr, 10);
					if (!isNaN(parsed)) appointmentId = parsed;
				}
				console.log('🔍 Extracted appointment ID:', appointmentId);

				if (!approved) {
					console.log('⚠️ Transaction not approved:', txStatus);
					return res.status(200).json({ received: true, note: 'transaction not approved' });
				}
				
				if (!appointmentId) {
					console.log('⚠️ No appointment ID found in invoice number:', invoiceNumber);
					return res.status(200).json({ received: true, note: 'no appointment id' });
				}

				try {
					const appt = await storage.getAppointment(appointmentId);
					if (!appt) {
						console.log('⚠️ Appointment not found:', appointmentId);
						return res.status(200).json({ received: true, note: 'appointment not found' });
					}
					console.log('📅 Found appointment:', appt);

					// Update or create payment record
					const allPayments = await storage.getAllPayments();
					const pending = allPayments.find(p => p.appointmentId === appointmentId && p.method === 'helcim_terminal' && p.status === 'pending');
					if (pending) {
						console.log('💰 Updating pending payment:', pending.id);
						await storage.updatePayment(pending.id, {
							status: 'completed',
							amount,
							totalAmount: amount,
							description: 'Helcim Smart Terminal payment (webhook confirmed)'
						});
					} else {
						console.log('💰 Creating new payment record');
						await storage.createPayment({
							appointmentId,
							clientId: appt.clientId,
							amount,
							tipAmount: 0,
							totalAmount: amount,
							method: 'helcim_terminal',
							status: 'completed',
							type: 'appointment',
							description: 'Helcim Smart Terminal payment (webhook)'
						});
					}

					// Mark appointment as paid
					console.log('✅ Marking appointment paid:', appointmentId);
					// Force refresh appointment data
					const freshAppt = await storage.getAppointment(appointmentId);
					if (freshAppt) {
						console.log('🔄 Updating appointment payment status:', { 
							id: appointmentId,
							before: { status: freshAppt.status, paymentStatus: freshAppt.paymentStatus },
							after: { status: freshAppt.status === 'pending' ? 'confirmed' : freshAppt.status, paymentStatus: 'paid' }
						});
						await storage.updateAppointment(appointmentId, {
							paymentStatus: 'paid',
							totalAmount: amount,
							status: freshAppt.status === 'pending' ? 'confirmed' : freshAppt.status
						});
						console.log('✨ Successfully processed webhook payment');
						return res.status(200).json({ received: true, success: true });
					} else {
						console.log('⚠️ Failed to refresh appointment:', appointmentId);
						return res.status(200).json({ received: true, note: 'appointment refresh failed' });
					}
				} catch (error) {
					console.error('❌ Error processing webhook payment:', error);
					return res.status(200).json({ received: true, error: String(error) });
				}
			} else {
				console.log('⚠️ Invalid webhook type or missing ID:', { type, id, transactionId });
				return res.status(200).json({ received: true, note: 'invalid webhook type' });
			}
		} catch (err: any) {
			console.error('❌ Webhook error:', err);
			return res.status(200).json({ received: true }); // still 2xx to avoid retries storm on our side errors
		}
	});

	// Aliases for environments where reverse proxies strip or change base paths
	app.get('/helcim-smart-terminal/webhook', async (_req: Request, res: Response) => {
		return res.status(200).json({ ok: true });
	});

	app.head('/helcim-smart-terminal/webhook', async (_req: Request, res: Response) => {
		return res.sendStatus(200);
	});

	app.post('/helcim-smart-terminal/webhook', async (req: Request, res: Response) => {
		// Delegate to main handler by reusing the same logic
		return app._router.handle({ ...req, url: '/api/helcim-smart-terminal/webhook', method: 'POST' } as any, res, () => res.status(200).json({ received: true }));
	});

	// Minimal alias for Replit-style path
	app.get('/h/webhook', async (_req: Request, res: Response) => {
		return res.status(200).json({ ok: true });
	});
	app.head('/h/webhook', async (_req: Request, res: Response) => {
		return res.sendStatus(200);
	});
	app.post('/h/webhook', async (req: Request, res: Response) => {
		// Delegate to main handler by reusing the same logic
		return app._router.handle({ ...req, url: '/api/helcim-smart-terminal/webhook', method: 'POST' } as any, res, () => res.status(200).json({ received: true }));
	});

	app.get('/api/webhooks/helcim', async (_req: Request, res: Response) => {
		return res.status(200).json({ ok: true });
	});
	app.head('/api/webhooks/helcim', async (_req: Request, res: Response) => {
		return res.sendStatus(200);
	});
	app.post('/api/webhooks/helcim', async (req: Request, res: Response) => {
		// Delegate to main handler by reusing the same logic
		return app._router.handle({ ...req, url: '/api/helcim-smart-terminal/webhook', method: 'POST' } as any, res, () => res.status(200).json({ received: true }));
	});

	// Manual confirmation endpoint (fallback if webhooks aren't configured)
	// Confirms a pending Helcim terminal payment for an appointment by flipping status to completed
	app.post('/api/helcim-smart-terminal/appointments/:appointmentId/mark-completed', async (req: Request, res: Response) => {
		try {
			const appointmentId = parseInt(String(req.params.appointmentId), 10);
			if (!appointmentId || Number.isNaN(appointmentId)) return res.status(400).json({ error: 'Invalid appointmentId' });
			const explicitAmount: number | undefined = typeof req.body?.amount === 'number' ? req.body.amount : undefined;
			const appointment = await storage.getAppointment(appointmentId);
			if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

			const amount = typeof explicitAmount === 'number' && explicitAmount > 0
				? explicitAmount
				: Number(appointment.totalAmount || 0);
			if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount required to confirm payment' });

			const allPayments = await storage.getAllPayments();
			const pending = allPayments.find(p => p.appointmentId === appointmentId && p.method === 'helcim_terminal' && p.status === 'pending');
			if (pending) {
				await storage.updatePayment(pending.id, {
					status: 'completed',
					amount,
					totalAmount: amount,
					description: 'Helcim Smart Terminal payment (manual confirm)'
				});
			} else {
				await storage.createPayment({
					appointmentId,
					clientId: appointment.clientId,
					amount,
					tipAmount: 0,
					totalAmount: amount,
					method: 'helcim_terminal',
					status: 'completed',
					type: 'appointment',
					description: 'Helcim Smart Terminal payment (manual confirm)'
				});
			}

			// Force refresh appointment data
			const freshAppt = await storage.getAppointment(appointmentId);
			if (freshAppt) {
				console.log('🔄 Updating appointment payment status:', { before: freshAppt.paymentStatus, after: 'paid' });
				await storage.updateAppointment(appointmentId, {
					paymentStatus: 'paid',
					totalAmount: amount,
					status: freshAppt.status === 'pending' ? 'confirmed' : freshAppt.status
				});
			}

			return res.status(200).json({ success: true, appointmentId, amount });
		} catch (err: any) {
			return res.status(500).json({ error: err.message || 'Failed to confirm payment' });
		}
	});

	// Transaction sync endpoint (uses Helcim cardTransactionId to update local state)
	app.post('/api/helcim-smart-terminal/transactions/:transactionId/confirm', async (req: Request, res: Response) => {
		try {
			if (!helcim) return res.status(500).json({ error: 'Helcim not configured' });
			const transactionId = String(req.params.transactionId);
			const result = await helcim.getCardTransactionById(transactionId);
			if (!result.ok) return res.status(result.status).json({ error: 'Failed to fetch transaction' });

			const tx = result.body as any;
			const amount = parseFloat(String(tx?.transactionAmount ?? tx?.amount ?? 0));
			const txStatus: string = String(tx?.status ?? tx?.transactionStatus ?? '').toUpperCase();
			const approved = txStatus.includes('APPROVED') || txStatus === 'SUCCESS' || txStatus.includes('COMPLETED');
			const invoiceNumber: string | undefined = tx?.invoiceNumber || tx?.invoice?.invoiceNumber;
			let appointmentId: number | undefined = undefined;
			if (invoiceNumber && invoiceNumber.startsWith('APT-')) {
				const idStr = invoiceNumber.split('APT-')[1];
				const parsed = parseInt(idStr, 10);
				if (!isNaN(parsed)) appointmentId = parsed;
			}

			if (approved && appointmentId) {
				const appt = await storage.getAppointment(appointmentId);
				if (appt) {
					const allPayments = await storage.getAllPayments();
					const pending = allPayments.find(p => p.appointmentId === appointmentId && p.method === 'helcim_terminal' && p.status === 'pending');
					if (pending) {
						await storage.updatePayment(pending.id, {
							status: 'completed',
							amount,
							totalAmount: amount,
							description: 'Helcim Smart Terminal payment (manual sync)'
						});
					} else {
						await storage.createPayment({
							appointmentId,
							clientId: appt.clientId,
							amount,
							tipAmount: 0,
							totalAmount: amount,
							method: 'helcim_terminal',
							status: 'completed',
							type: 'appointment',
							description: 'Helcim Smart Terminal payment (manual sync)'
						});
					}
					// Force refresh appointment data
					const freshAppt = await storage.getAppointment(appointmentId);
					if (freshAppt) {
						console.log('🔄 Updating appointment payment status:', { before: freshAppt.paymentStatus, after: 'paid' });
						await storage.updateAppointment(appointmentId, {
							paymentStatus: 'paid',
							totalAmount: amount,
							status: freshAppt.status === 'pending' ? 'confirmed' : freshAppt.status
						});
					}
				}
			}

			return res.status(200).json({ success: true, transactionId, appointmentId, amount });
		} catch (err: any) {
			return res.status(500).json({ error: err.message || 'Failed to confirm transaction' });
		}
	});
}