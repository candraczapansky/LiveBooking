#!/bin/bash

# Load Testing Setup Script for Salon/Spa Management System
# This script installs k6 and sets up load testing

set -e

echo "🚀 Setting up load testing environment..."

# Install k6
echo "📦 Installing k6..."
if ! command -v k6 &> /dev/null; then
    # For Ubuntu/Debian
    if command -v apt &> /dev/null; then
        sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt update
        sudo apt install k6
    # For CentOS/RHEL
    elif command -v yum &> /dev/null; then
        sudo yum install https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.rpm
    # For macOS
    elif command -v brew &> /dev/null; then
        brew install k6
    else
        echo "❌ Unsupported operating system. Please install k6 manually."
        exit 1
    fi
else
    echo "✅ k6 is already installed"
fi

# Create test user for load testing
echo "👤 Creating test user for load testing..."
cat > create-test-user.js << 'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTestUser() {
  try {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    const result = await pool.query(`
      INSERT INTO users (username, email, password, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `, ['testuser', 'test@example.com', hashedPassword, 'Test', 'User', 'admin']);
    
    if (result.rows.length > 0) {
      console.log('✅ Test user created successfully');
    } else {
      console.log('ℹ️  Test user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUser();
EOF

# Run the script to create test user
node create-test-user.js

# Create load testing configuration
echo "📝 Creating load testing configuration..."
cat > load-test-config.json << 'EOF'
{
  "baseUrl": "https://yourdomain.com",
  "testUser": {
    "username": "testuser",
    "password": "testpassword123"
  },
  "scenarios": {
    "smoke": {
      "duration": "1m",
      "target": 10
    },
    "load": {
      "duration": "5m",
      "target": 50
    },
    "stress": {
      "duration": "10m",
      "target": 100
    },
    "spike": {
      "duration": "2m",
      "target": 200
    }
  },
  "thresholds": {
    "http_req_duration": ["p(95)<2000"],
    "http_req_failed": ["rate<0.1"],
    "errors": ["rate<0.1"]
  }
}
EOF

# Create load testing runner script
echo "🔧 Creating load testing runner..."
cat > run-load-test.sh << 'EOF'
#!/bin/bash

# Load Testing Runner Script
# Usage: ./run-load-test.sh [scenario]

set -e

SCENARIO=${1:-"load"}
BASE_URL=${2:-"https://yourdomain.com"}

echo "🚀 Running $SCENARIO test for $BASE_URL..."

# Update the load test script with the correct base URL
sed -i "s|https://yourdomain.com|$BASE_URL|g" load-test.js

# Run the load test
k6 run \
  --env BASE_URL="$BASE_URL" \
  --out json=results/load-test-results.json \
  --out influxdb=http://localhost:8086/k6 \
  load-test.js

echo "✅ Load test completed!"
echo "📊 Results saved to results/load-test-results.json"
EOF

chmod +x run-load-test.sh

# Create results directory
mkdir -p results

# Create performance monitoring script
echo "📊 Creating performance monitoring script..."
cat > monitor-performance.sh << 'EOF'
#!/bin/bash

# Performance Monitoring Script
# This script monitors system performance during load tests

echo "📊 Monitoring system performance..."

# Monitor CPU usage
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

# Monitor memory usage
echo "Memory Usage:"
free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }'

# Monitor disk usage
echo "Disk Usage:"
df -h | awk '$NF=="/"{printf "Disk Usage: %d/%dGB (%s)\n", $3,$2,$5}'

# Monitor network connections
echo "Active Network Connections:"
netstat -an | grep :5000 | wc -l

# Monitor application logs
echo "Recent Application Errors:"
tail -n 20 logs/error.log 2>/dev/null || echo "No error log found"

# Monitor nginx access logs
echo "Recent Nginx Requests:"
tail -n 10 /var/log/nginx/salon-spa-access.log 2>/dev/null || echo "No nginx log found"
EOF

chmod +x monitor-performance.sh

# Create load testing scenarios
echo "📋 Creating load testing scenarios..."

# Smoke test (quick validation)
cat > smoke-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function() {
  const BASE_URL = __ENV.BASE_URL || 'https://yourdomain.com';
  
  const checks = [
    http.get(`${BASE_URL}/api/health`),
    http.get(`${BASE_URL}/api/services`),
  ];
  
  checks.forEach(response => {
    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  });
}
EOF

# Stress test
cat > stress-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function() {
  const BASE_URL = __ENV.BASE_URL || 'https://yourdomain.com';
  
  const scenarios = [
    { url: '/api/health', method: 'GET' },
    { url: '/api/services', method: 'GET' },
    { url: '/api/appointments', method: 'GET' },
  ];
  
  scenarios.forEach(scenario => {
    const response = http[scenario.method.toLowerCase()](`${BASE_URL}${scenario.url}`);
    
    check(response, {
      'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'response time < 3000ms': (r) => r.timings.duration < 3000,
    });
  });
  
  sleep(1);
}
EOF

echo "✅ Load testing setup completed!"
echo ""
echo "📋 Available commands:"
echo "- Run smoke test: k6 run smoke-test.js"
echo "- Run load test: ./run-load-test.sh load"
echo "- Run stress test: k6 run stress-test.js"
echo "- Monitor performance: ./monitor-performance.sh"
echo ""
echo "🔗 Useful k6 commands:"
echo "- k6 run load-test.js"
echo "- k6 run --env BASE_URL=https://yourdomain.com load-test.js"
echo "- k6 run --stage 30s:20 load-test.js"
echo ""
echo "📊 To view results in real-time:"
echo "- Install InfluxDB and Grafana for metrics visualization"
echo "- Or check the JSON results file: results/load-test-results.json" 