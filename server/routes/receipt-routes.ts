import { Router } from 'express';
import { IStorage } from '../storage.js';
import { sendSMS } from '../sms.js';
import { sendEmail } from '../email.js';

export default function createReceiptRoutes(storage: IStorage) {
  const router = Router();

  router.post('/send-receipt', async (req, res) => {
    try {
      const { type, recipient, paymentDetails } = req.body;

      if (!type || !recipient || !paymentDetails) {
        return res.status(400).json({ 
          error: 'Missing required fields: type, recipient, and paymentDetails' 
        });
      }

      // Format receipt message
      const formatReceipt = () => {
        const amount = paymentDetails.amount || paymentDetails.total;
        const tipAmount = paymentDetails.tipAmount;
        const transactionId = paymentDetails.transactionId;
        const cardLast4 = paymentDetails.last4 || paymentDetails.cardLast4;
        const timestamp = new Date(paymentDetails.timestamp || Date.now()).toLocaleString();
        const description = paymentDetails.description || 'Payment';

        let message = `Payment Receipt\n`;
        message += `================\n`;
        message += `${description}\n\n`;
        message += `Date: ${timestamp}\n`;
        message += `Amount: $${amount.toFixed(2)}`;
        
        if (tipAmount && tipAmount > 0) {
          const baseAmount = amount - tipAmount;
          message = `Payment Receipt\n`;
          message += `================\n`;
          message += `${description}\n\n`;
          message += `Date: ${timestamp}\n`;
          message += `Subtotal: $${baseAmount.toFixed(2)}\n`;
          message += `Tip: $${tipAmount.toFixed(2)}\n`;
          message += `Total: $${amount.toFixed(2)}`;
        }

        if (cardLast4) {
          message += `\nCard: ****${cardLast4}`;
        }

        if (transactionId) {
          message += `\nTransaction ID: ${transactionId}`;
        }

        message += `\n\nThank you for your payment!`;
        return message;
      };

      const formatHTMLReceipt = () => {
        const amount = paymentDetails.amount || paymentDetails.total;
        const tipAmount = paymentDetails.tipAmount;
        const transactionId = paymentDetails.transactionId;
        const cardLast4 = paymentDetails.last4 || paymentDetails.cardLast4;
        const timestamp = new Date(paymentDetails.timestamp || Date.now()).toLocaleString();
        const description = paymentDetails.description || 'Payment';

        let html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Payment Receipt</h2>
            <p style="color: #666; font-size: 16px; margin-top: 20px;">${description}</p>
            
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #666;">Date:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold;">${timestamp}</td>
              </tr>`;

        if (tipAmount && tipAmount > 0) {
          const baseAmount = amount - tipAmount;
          html += `
              <tr>
                <td style="padding: 10px 0; color: #666;">Subtotal:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold;">$${baseAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Tip:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #4CAF50;">$${tipAmount.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 2px solid #ddd;">
                <td style="padding: 10px 0; color: #333; font-size: 18px;">Total:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 18px; color: #333;">$${amount.toFixed(2)}</td>
              </tr>`;
        } else {
          html += `
              <tr style="border-top: 2px solid #ddd;">
                <td style="padding: 10px 0; color: #333; font-size: 18px;">Total:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 18px; color: #333;">$${amount.toFixed(2)}</td>
              </tr>`;
        }

        if (cardLast4) {
          html += `
              <tr>
                <td style="padding: 10px 0; color: #666;">Payment Method:</td>
                <td style="padding: 10px 0; text-align: right;">Card ****${cardLast4}</td>
              </tr>`;
        }

        if (transactionId) {
          html += `
              <tr>
                <td style="padding: 10px 0; color: #666;">Transaction ID:</td>
                <td style="padding: 10px 0; text-align: right; font-family: monospace; font-size: 12px;">${transactionId}</td>
              </tr>`;
        }

        html += `
            </table>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 5px; text-align: center;">
              <p style="color: #666; margin: 0;">Thank you for your payment!</p>
            </div>
          </div>`;

        return html;
      };

      if (type === 'email') {
        // Send email receipt
        const htmlContent = formatHTMLReceipt();
        const plainTextContent = formatReceipt();

        const success = await sendEmail({
          to: recipient,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
          subject: 'Payment Receipt',
          text: plainTextContent,
          html: htmlContent,
        });

        if (success) {
          console.log(`📧 Email receipt sent to ${recipient}`);
          return res.json({ success: true, message: 'Email receipt sent successfully' });
        } else {
          console.error('Failed to send email receipt');
          return res.status(500).json({ error: 'Failed to send email receipt' });
        }
        
      } else if (type === 'sms') {
        // Send SMS receipt
        const message = formatReceipt();
        const result = await sendSMS(recipient, message);

        if (result.success) {
          console.log(`📱 SMS receipt sent to ${recipient}`);
          return res.json({ success: true, message: 'SMS receipt sent successfully', messageId: result.messageId });
        } else {
          console.error('Failed to send SMS receipt:', result.error);
          return res.status(500).json({ error: result.error || 'Failed to send SMS receipt' });
        }
        
      } else {
        return res.status(400).json({ error: 'Invalid receipt type. Use "email" or "sms"' });
      }

    } catch (error: any) {
      console.error('Error sending receipt:', error);
      return res.status(500).json({ 
        error: 'Failed to send receipt', 
        details: error.message 
      });
    }
  });

  return router;
}
