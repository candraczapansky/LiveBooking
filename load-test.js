import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    // Ramp up to 50 users over 2 minutes
    { duration: '2m', target: 50 },
    // Stay at 50 users for 5 minutes
    { duration: '5m', target: 50 },
    // Ramp up to 100 users over 2 minutes
    { duration: '2m', target: 100 },
    // Stay at 100 users for 5 minutes
    { duration: '5m', target: 100 },
    // Ramp down to 0 users over 2 minutes
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'], // Error rate should be below 10%
    errors: ['rate<0.1'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'https://yourdomain.com';
const TEST_USER = {
  username: 'testuser',
  password: 'testpassword123',
};

// Helper function to get auth token
function getAuthToken() {
  const loginRes = http.post(`${BASE_URL}/api/login`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return body.token;
  }
  
  return null;
}

// Main test function
export default function() {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };

  // Test scenarios
  const scenarios = [
    // Health check
    {
      name: 'Health Check',
      url: `${BASE_URL}/api/health`,
      method: 'GET',
      auth: false,
    },
    
    // Authentication
    {
      name: 'Login',
      url: `${BASE_URL}/api/login`,
      method: 'POST',
      body: JSON.stringify(TEST_USER),
      auth: false,
    },
    
    // Reports API (requires authentication)
    {
      name: 'Sales Report',
      url: `${BASE_URL}/api/reports/sales/category?start_date=2024-01-01&end_date=2024-12-31`,
      method: 'GET',
      auth: true,
    },
    
    {
      name: 'Client Retention',
      url: `${BASE_URL}/api/reports/clients/retention?start_date=2024-01-01&end_date=2024-12-31`,
      method: 'GET',
      auth: true,
    },
    
    {
      name: 'Strategic Insights',
      url: `${BASE_URL}/api/reports/strategic-insights?start_date=2024-01-01&end_date=2024-12-31`,
      method: 'GET',
      auth: true,
    },
    
    // Appointments API
    {
      name: 'Get Appointments',
      url: `${BASE_URL}/api/appointments`,
      method: 'GET',
      auth: true,
    },
    
    // Services API
    {
      name: 'Get Services',
      url: `${BASE_URL}/api/services`,
      method: 'GET',
      auth: false,
    },
  ];

  // Execute scenarios
  scenarios.forEach(scenario => {
    const requestHeaders = { ...headers };
    if (!scenario.auth) {
      delete requestHeaders.Authorization;
    }

    const params = {
      headers: requestHeaders,
      timeout: '30s',
    };

    let response;
    
    switch (scenario.method) {
      case 'GET':
        response = http.get(scenario.url, params);
        break;
      case 'POST':
        response = http.post(scenario.url, scenario.body, params);
        break;
      case 'PUT':
        response = http.put(scenario.url, scenario.body, params);
        break;
      case 'DELETE':
        response = http.del(scenario.url, params);
        break;
    }

    // Check response
    const success = check(response, {
      [`${scenario.name} - Status is 200 or 401 (auth required)`]: (r) => 
        r.status === 200 || r.status === 401,
      [`${scenario.name} - Response time < 2000ms`]: (r) => 
        r.timings.duration < 2000,
      [`${scenario.name} - Response has content`]: (r) => 
        r.body && r.body.length > 0,
    });

    if (!success) {
      errorRate.add(1);
      console.log(`❌ ${scenario.name} failed: ${response.status} - ${response.body}`);
    } else {
      errorRate.add(0);
    }

    // Add some randomness to simulate real user behavior
    sleep(Math.random() * 3 + 1);
  });
}

// Setup function (runs once before the test)
export function setup() {
  console.log('🚀 Starting load test for:', BASE_URL);
  
  // Test basic connectivity
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, {
    'Health check passes': (r) => r.status === 200,
  });
  
  return { baseUrl: BASE_URL };
}

// Teardown function (runs once after the test)
export function teardown(data) {
  console.log('✅ Load test completed for:', data.baseUrl);
}

// Handle test results
export function handleSummary(data) {
  const summary = {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
📊 Load Test Summary
==================
Base URL: ${BASE_URL}
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.passes}
Success Rate: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
Max Response Time: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
Requests per Second: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s
    `,
  };
  
  return summary;
} 