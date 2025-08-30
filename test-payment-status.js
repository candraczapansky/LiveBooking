import http from 'http';

const testPaymentStatus = (paymentId) => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/terminal/payment/test/${paymentId}`,
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response:', data);
        resolve(data);
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      reject(e);
    });

    req.end();
  });
};

// Test with a fake payment ID
console.log('Testing payment status endpoint...');
testPaymentStatus('test-payment-123').catch(console.error);