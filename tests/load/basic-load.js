/**
 * K6 Load Testing Script
 * Phase 8: Performance Foundation
 * 
 * Run with: k6 run tests/load/basic-load.js
 * With custom URL: BASE_URL=https://your-app.replit.dev k6 run tests/load/basic-load.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],     // Less than 1% failures
    errors: ['rate<0.01'],              // Custom error rate under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('Health Checks', function () {
    // Basic health check
    const healthRes = http.get(`${BASE_URL}/health`);
    healthCheckDuration.add(healthRes.timings.duration);
    
    const healthOk = check(healthRes, {
      'health check status 200': (r) => r.status === 200,
      'health check has status': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy' || body.status === 'ok';
        } catch {
          return false;
        }
      },
    });
    
    errorRate.add(!healthOk);

    // Ready probe
    const readyRes = http.get(`${BASE_URL}/health/ready`);
    check(readyRes, {
      'ready probe status 200': (r) => r.status === 200,
    });
  });

  group('API Endpoints', function () {
    // API root
    const apiRes = http.get(`${BASE_URL}/api/v1`);
    check(apiRes, {
      'API root accessible': (r) => r.status === 200,
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'tests/load/results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options = {}) {
  const { indent = '', enableColors = false } = options;
  
  const green = enableColors ? '\x1b[32m' : '';
  const red = enableColors ? '\x1b[31m' : '';
  const reset = enableColors ? '\x1b[0m' : '';
  
  let summary = '\n';
  summary += `${indent}=============================================\n`;
  summary += `${indent}  K6 Load Test Summary\n`;
  summary += `${indent}=============================================\n\n`;
  
  if (data.metrics.http_req_duration) {
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const avg = data.metrics.http_req_duration.values.avg;
    const color = p95 < 500 ? green : red;
    
    summary += `${indent}Request Duration:\n`;
    summary += `${indent}  ${color}p(95): ${p95.toFixed(2)}ms${reset}\n`;
    summary += `${indent}  avg: ${avg.toFixed(2)}ms\n\n`;
  }
  
  if (data.metrics.http_reqs) {
    const total = data.metrics.http_reqs.values.count;
    const rate = data.metrics.http_reqs.values.rate;
    
    summary += `${indent}Requests:\n`;
    summary += `${indent}  total: ${total}\n`;
    summary += `${indent}  rate: ${rate.toFixed(2)}/s\n\n`;
  }
  
  if (data.metrics.http_req_failed) {
    const failRate = data.metrics.http_req_failed.values.rate * 100;
    const color = failRate < 1 ? green : red;
    
    summary += `${indent}Failures:\n`;
    summary += `${indent}  ${color}rate: ${failRate.toFixed(2)}%${reset}\n\n`;
  }
  
  summary += `${indent}=============================================\n`;
  
  return summary;
}
