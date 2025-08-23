console.log('Starting simple test...');

const apiToken = 'a7Cms-m0D4K88wr1MXFe6YkvfpTrn8Qra3TtXml9MZ8kLj5Ehf0FG3AsQ';

fetch('https://api.helcim.com/v1/payment/purchase', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 25.00,
    currency: 'USD',
    test: true,
    paymentMethod: {
      paymentType: 'cc',
      creditCard: {
        cardNumber: '5454545454545454',
        expiryMonth: '12',
        expiryYear: '25',
        cardCvv: '123'
      }
    }
  })
})
.then(response => {
  console.log('Status:', response.status);
  return response.text();
})
.then(text => {
  console.log('Response:', text);
})
.catch(error => {
  console.log('Error:', error.message);
});

