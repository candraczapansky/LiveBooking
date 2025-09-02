import { z } from "zod";
import { sendEmail } from "../email.js";
import { sendSMS } from "../sms.js";
import { ValidationError, asyncHandler } from "../utils/errors.js";
import { formatCurrency } from "../utils/formatting.js";
import LoggerService, { getLogContext } from "../utils/logger.js";

export function registerReceiptRoutes(app, storage) {
  // Send receipt via email
  app.post("/api/send-receipt-email", asyncHandler(async (req, res) => {
    const context = getLogContext(req);
    
    // Validate request body
    const schema = z.object({
      email: z.string().email(),
      receiptData: z.object({
        transactionId: z.string().or(z.number()).optional(),
        paymentId: z.string().or(z.number()).optional(),
        appointmentId: z.string().or(z.number()).optional(),
        timestamp: z.string().optional(),
        total: z.number(),
        paymentMethod: z.string(),
        name: z.string().optional(),
        customerName: z.string().optional(),
        items: z.array(z.object({
          name: z.string(),
          quantity: z.number().optional(),
          price: z.number().optional(),
          total: z.number().optional()
        })).optional()
      })
    });

    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid receipt data");
    }

    const { email, receiptData } = parseResult.data;
    
    LoggerService.info("Sending receipt email", { ...context, email, receiptData });
    
    // Generate email receipt HTML
    const timestamp = receiptData.timestamp ? new Date(receiptData.timestamp).toLocaleString() : new Date().toLocaleString();
    let businessName = process.env.BUSINESS_NAME || 'Glo Head Spa';
    
    let itemsHtml = '';
    if (receiptData.items && receiptData.items.length > 0) {
      itemsHtml = `
        <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #eee;">
            <th style="text-align:left; padding: 8px;">Item</th>
            <th style="text-align:center; padding: 8px;">Qty</th>
            <th style="text-align:right; padding: 8px;">Price</th>
          </tr>
          ${receiptData.items.map(item => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px;">${item.name}</td>
              <td style="text-align:center; padding: 8px;">${item.quantity || 1}</td>
              <td style="text-align:right; padding: 8px;">${formatCurrency(item.price || item.total || 0)}</td>
            </tr>
          `).join('')}
        </table>
      `;
    } else if (receiptData.name) {
      // Single item receipt
      itemsHtml = `
        <p style="margin-bottom: 15px;"><strong>${receiptData.name}</strong></p>
      `;
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #333;">${businessName} - Receipt</h2>
          <p style="margin-bottom: 5px;"><strong>Date:</strong> ${timestamp}</p>
          <p style="margin-bottom: 5px;"><strong>Transaction ID:</strong> ${receiptData.transactionId || receiptData.paymentId || '#' + Math.floor(Math.random() * 10000)}</p>
          <p style="margin-bottom: 5px;"><strong>Payment Method:</strong> ${receiptData.paymentMethod}</p>
          ${receiptData.customerName ? `<p style="margin-bottom: 15px;"><strong>Customer:</strong> ${receiptData.customerName}</p>` : ''}
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #333;">Payment Details</h3>
          ${itemsHtml}
          <p style="font-size: 18px; font-weight: bold; text-align: right;">
            Total: ${formatCurrency(receiptData.total)}
          </p>
        </div>
        
        <div style="font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          <p>Thank you for your business!</p>
          <p>This receipt was automatically generated. Please contact us if you have any questions.</p>
          <p>${businessName}</p>
        </div>
      </div>
    `;
    
    const text = `
      ${businessName} - Receipt
      
      Date: ${timestamp}
      Transaction ID: ${receiptData.transactionId || receiptData.paymentId || '#' + Math.floor(Math.random() * 10000)}
      Payment Method: ${receiptData.paymentMethod}
      ${receiptData.customerName ? `Customer: ${receiptData.customerName}` : ''}
      
      Payment Details:
      ${receiptData.items ? 
        receiptData.items.map(item => `- ${item.name}: ${formatCurrency(item.price || item.total || 0)} x ${item.quantity || 1}`).join('\n') : 
        receiptData.name ? `- ${receiptData.name}` : ''
      }
      
      Total: ${formatCurrency(receiptData.total)}
      
      Thank you for your business!
      
      ${businessName}
    `;
    
    // Get business details from configuration if available
    let fromEmail = process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com';
    let fromName = businessName;
    
    try {
      // Try to get from database config if available
      const { DatabaseConfig } = await import('../config.js');
      const { DatabaseStorage } = await import('../storage.js');
      const dbStorage = new DatabaseStorage();
      const dbConfig = new DatabaseConfig(dbStorage);
      
      const dbFromEmail = await dbConfig.getSendGridFromEmail();
      const dbBusinessName = await dbConfig.getConfig('business_name');
      
      if (dbFromEmail) {
        fromEmail = dbFromEmail;
      }
      if (dbBusinessName) {
        fromName = dbBusinessName;
      }
    } catch (error) {
      // Fallback to environment variables
      console.log('Receipt: Using environment variables for email config');
    }
    
    // Send email using the same sendEmail utility used by other parts of the app
    const sent = await sendEmail({
      to: email,
      from: fromEmail,
      fromName,
      subject: `${businessName} - Receipt for Your Payment`,
      html,
      text
    });
    
    if (!sent) {
      throw new Error("Failed to send receipt email");
    }
    
    res.json({ success: true });
  }));
  
  // Send receipt via SMS
  app.post("/api/send-receipt-sms", asyncHandler(async (req, res) => {
    const context = getLogContext(req);
    
    // Validate request body
    const schema = z.object({
      phone: z.string(),
      receiptData: z.object({
        transactionId: z.string().or(z.number()).optional(),
        paymentId: z.string().or(z.number()).optional(),
        appointmentId: z.string().or(z.number()).optional(),
        total: z.number(),
        paymentMethod: z.string()
      })
    });
    
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid receipt data");
    }
    
    const { phone, receiptData } = parseResult.data;
    
    LoggerService.info("Sending receipt SMS", { ...context, phone, receiptData });
    
    // Get business details from configuration if available
    let businessName = process.env.BUSINESS_NAME || 'Glo Head Spa';
    
    try {
      // Try to get business name from database config if available
      const { DatabaseConfig } = await import('../config.js');
      const { DatabaseStorage } = await import('../storage.js');
      const dbStorage = new DatabaseStorage();
      const dbConfig = new DatabaseConfig(dbStorage);
      
      const dbBusinessName = await dbConfig.getConfig('business_name');
      if (dbBusinessName) {
        businessName = dbBusinessName;
      }
    } catch (error) {
      // Fallback to environment variables
      console.log('Receipt SMS: Using environment variables for business name');
    }
    
    const formattedTotal = formatCurrency(receiptData.total);
    const transactionId = receiptData.transactionId || receiptData.paymentId || '';
    
    // Create the message with proper compliance text (will be added by the sendSMS function)
    const message = `${businessName} Receipt: Thank you for your ${formattedTotal} payment via ${receiptData.paymentMethod}. ${transactionId ? `Transaction ID: ${transactionId}.` : ''} Thank you for your business!`;
    
    // Send SMS using the same sendSMS utility used by other parts of the app
    // This will handle Twilio credentials, phone number formatting, and opt-out compliance
    const result = await sendSMS(phone, message);
    
    if (!result.success) {
      throw new Error(result.error || "Failed to send receipt SMS");
    }
    
    res.json({ success: true, messageId: result.messageId });
  }));
}
