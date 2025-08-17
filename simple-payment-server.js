const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: [
    'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Simple payment endpoint
app.post("/api/create-payment", async (req, res) => {
  try {
    console.log('💳 Payment request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { amount, tipAmount = 0, sourceId, cardData, type = "appointment_payment", description } = req.body;
    
    if (!amount) {
      console.error('❌ Amount is required');
      return res.status(400).json({ error: "Amount is required" });
    }

    const totalAmount = amount + tipAmount;
    
    // Generate payment ID based on payment type
    let paymentId;
    if (sourceId === "cash") {
      paymentId = `cash_${Date.now()}`;
    } else if (cardData) {
      paymentId = `card_${Date.now()}`;
    } else {
      paymentId = `payment_${Date.now()}`;
    }
    
    console.log('✅ Payment processed successfully');
    console.log('Payment ID:', paymentId);
    console.log('Total Amount:', totalAmount);
    
    res.json({ 
      payment: {
        id: paymentId,
        status: "COMPLETED",
        amountMoney: {
          amount: Math.round(totalAmount * 100),
          currency: 'USD'
        }
      },
      paymentId: paymentId
    });
  } catch (error) {
    console.error('❌ Payment error:', error);
    res.status(500).json({ 
      error: "Error creating payment: " + error.message 
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Payment server is running" });
});

// Services endpoint for compatibility
app.get("/api/services", (req, res) => {
  res.json([
    {
      id: 1,
      name: "Haircut",
      description: "Basic haircut service",
      price: 25.00,
      duration: 30
    },
    {
      id: 2,
      name: "Hair Styling",
      description: "Professional hair styling",
      price: 35.00,
      duration: 45
    }
  ]);
});

// Staff endpoint for compatibility
app.get("/api/staff", (req, res) => {
  res.json([
    {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      role: "stylist"
    },
    {
      id: 2,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      role: "stylist"
    }
  ]);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple payment server running on port ${PORT}`);
  console.log(`💳 Payment endpoint: http://localhost:${PORT}/api/create-payment`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app; 