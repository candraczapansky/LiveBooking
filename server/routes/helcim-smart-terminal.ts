import { Express } from 'express';
import { helcimSmartTerminalService } from '../helcim-smart-terminal-service';
import type { IStorage } from '../storage';

export function registerHelcimSmartTerminalRoutes(app: Express, storage: IStorage) {
  // Health check endpoint
  app.get('/api/helcim-smart-terminal/health', async (req, res) => {
    try {
      res.json({ 
        status: 'ok',
        service: 'helcim-smart-terminal',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // Get all devices
  app.get('/api/helcim-smart-terminal/devices', async (req, res) => {
    try {
      console.log('📱 Fetching Helcim Smart Terminal devices...');
      const devices = await helcimSmartTerminalService.getDevices();
      console.log(`✅ Found ${devices.length} device(s)`);
      res.json({ devices });
    } catch (error) {
      console.error('❌ Error fetching devices:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch devices' 
      });
    }
  });

  // Get specific device info
  app.get('/api/helcim-smart-terminal/devices/:deviceCode', async (req, res) => {
    try {
      const { deviceCode } = req.params;
      console.log(`📱 Getting info for device: ${deviceCode}`);
      
      const device = await helcimSmartTerminalService.getDeviceInfo(deviceCode);
      
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      res.json({ device });
    } catch (error) {
      console.error('❌ Error getting device info:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get device info' 
      });
    }
  });

  // Ping device
  app.post('/api/helcim-smart-terminal/devices/:deviceCode/ping', async (req, res) => {
    try {
      const { deviceCode } = req.params;
      console.log(`📱 Pinging device: ${deviceCode}`);
      
      const success = await helcimSmartTerminalService.pingDevice(deviceCode);
      
      res.json({ 
        success,
        message: success ? 'Device is online' : 'Device is offline or not responding'
      });
    } catch (error) {
      console.error('❌ Error pinging device:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to ping device' 
      });
    }
  });

  // Check device readiness
  app.post('/api/helcim-smart-terminal/devices/:deviceCode/check-readiness', async (req, res) => {
    try {
      const { deviceCode } = req.params;
      console.log(`📱 Checking readiness for device: ${deviceCode}`);
      
      const ready = await helcimSmartTerminalService.checkDeviceReadiness(deviceCode);
      
      res.json({ 
        ready,
        message: ready ? 'Device is ready to accept payments' : 'Device is not ready'
      });
    } catch (error) {
      console.error('❌ Error checking device readiness:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to check device readiness' 
      });
    }
  });

  // Initiate purchase
  app.post('/api/helcim-smart-terminal/devices/:deviceCode/purchase', async (req, res) => {
    try {
      const { deviceCode } = req.params;
      const purchaseData = req.body;
      
      // Make invoice number unique to prevent "already paid" errors
      if (!purchaseData.invoiceNumber && purchaseData.appointmentId) {
        purchaseData.invoiceNumber = `APT-${purchaseData.appointmentId}-${Date.now()}`;
      }
      
      console.log(`💳 Initiating purchase on device ${deviceCode}:`, purchaseData);
      
      const result = await helcimSmartTerminalService.initiatePurchase(deviceCode, purchaseData);
      
      // If purchase was successful, update the database
      if (result && result.status === 'completed') {
        try {
          // Save payment record to database
          const paymentRecord = await storage.createPayment({
            clientId: purchaseData.clientId || 1,
            amount: purchaseData.transactionAmount,
            tipAmount: purchaseData.tipAmount || 0,
            totalAmount: purchaseData.transactionAmount + (purchaseData.tipAmount || 0),
            method: 'terminal',
            status: 'completed',
            type: purchaseData.type || 'pos_payment',
            description: purchaseData.description || 'Helcim Smart Terminal Payment',
            paymentDate: new Date(),
            appointmentId: purchaseData.appointmentId || null
          });

          console.log('✅ Payment record saved to database:', paymentRecord);

          // If there's an appointment ID, update the appointment status
          if (purchaseData.appointmentId) {
            await storage.updateAppointment(purchaseData.appointmentId, { paymentStatus: 'paid' });
            console.log('✅ Appointment payment status updated to paid');
          }

          res.json({ 
            success: true,
            purchase: result,
            paymentRecord
          });
        } catch (dbError) {
          console.error('❌ Error saving payment to database:', dbError);
          // Still return success since payment went through
          res.json({ 
            success: true,
            purchase: result,
            warning: 'Payment processed but database update failed'
          });
        }
      } else {
        // Payment is pending or processing
        res.status(202).json({ 
          success: false,
          purchase: result,
          message: 'Payment initiated, waiting for terminal response'
        });
      }
    } catch (error) {
      console.error('❌ Error initiating purchase:', error);
      
      // Handle specific error codes
      if (error instanceof Error) {
        if (error.message.includes('Device conflict')) {
          return res.status(409).json({ 
            error: error.message,
            code: 'DEVICE_CONFLICT'
          });
        }
        if (error.message.includes('not supported')) {
          return res.status(400).json({ 
            error: error.message,
            code: 'DEVICE_NOT_SUPPORTED'
          });
        }
        if (error.message.includes('amount must be greater')) {
          return res.status(400).json({ 
            error: error.message,
            code: 'INVALID_AMOUNT'
          });
        }
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to initiate purchase' 
      });
    }
  });
}

