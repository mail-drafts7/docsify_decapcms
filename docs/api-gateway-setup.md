---
title: "API Gateway Pack - Technical Setup Guide"
description: "Developer guide for implementing the Microservices API Gateway"
order: 5
category: "docs"
---

# 🔧 API Gateway Pack - Technical Setup Guide

> **Enterprise-Grade API Management Implementation**

## Architecture Overview

```
┌─────────────┐   ┌─────────────────────────────────────────┐   ┌─────────────┐
│   Clients   │   │            API Gateway                  │   │ Microservices │
│             │   │                                         │   │             │
│ - Web Apps  │◄─►│ ┌─────────────┐ ┌─────────────────────┐ │◄─►│ - Auth API  │
│ - Mobile    │   │ │    Router   │ │   Load Balancer     │ │   │ - User API  │
│ - External  │   │ │             │ │                     │ │   │ - Order API │
│   APIs      │   │ └─────────────┘ └─────────────────────┘ │   │ - Payment   │
└─────────────┘   │ ┌─────────────┐ ┌─────────────────────┐ │   └─────────────┘
                  │ │Rate Limiter │ │   Circuit Breaker   │ │
                  │ └─────────────┘ └─────────────────────┘ │
                  │ ┌─────────────┐ ┌─────────────────────┐ │
                  │ │    Cache    │ │     Monitoring      │ │
                  │ └─────────────┘ └─────────────────────┘ │
                  └─────────────────────────────────────────┘
```

## Quick Start (10 minutes)

### 1. Installation

```bash
# Clone the API Gateway pack
git clone https://github.com/knowledgepack/api-gateway-pack.git
cd api-gateway-pack

# Using Docker (Recommended)
docker-compose up -d

# Or install locally
npm install
```

### 2. Configuration

```yaml
# config/gateway.yml
server:
  port: 8080
  host: 0.0.0.0

services:
  auth-service:
    url: http://auth-service:3001
    health_check: /health
    timeout: 5000
    retries: 3
    
  user-service:
    url: http://user-service:3002
    health_check: /health
    timeout: 3000
    
  order-service:
    url: http://order-service:3003
    health_check: /health
    timeout: 10000

routing:
  - path: /api/auth/**
    service: auth-service
    strip_path: false
    
  - path: /api/users/**
    service: user-service
    middleware: [auth, rate-limit]
    
  - path: /api/orders/**
    service: order-service
    middleware: [auth, rate-limit, circuit-breaker]

rate_limiting:
  default:
    requests_per_minute: 1000
    burst: 50
  paths:
    /api/auth/login:
      requests_per_minute: 10
      burst: 2

circuit_breaker:
  failure_threshold: 5
  recovery_timeout: 30s
  success_threshold: 3
```

### 3. Start Gateway

```bash
npm start
# Gateway available at http://localhost:8080
```

## Core Features Implementation

### Load Balancing

```javascript
// middleware/loadBalancer.js
const loadBalancers = {
  roundRobin: (services) => {
    let current = 0;
    return () => services[current++ % services.length];
  },
  
  weighted: (services) => {
    const weights = services.map(s => s.weight || 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    return () => {
      let random = Math.random() * totalWeight;
      for (let i = 0; i < services.length; i++) {
        random -= weights[i];
        if (random <= 0) return services[i];
      }
    };
  },
  
  leastConnections: (services) => {
    return () => services.reduce((prev, curr) => 
      prev.connections < curr.connections ? prev : curr
    );
  }
};
```

### Circuit Breaker

```javascript
// middleware/circuitBreaker.js
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 30000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

### Request/Response Transformation

```javascript
// middleware/transform.js
const transformations = {
  // Transform request before forwarding
  transformRequest: (config) => ({
    headers: {
      ...config.headers,
      'X-Gateway-Timestamp': Date.now(),
      'X-Request-ID': generateRequestId()
    },
    body: config.transform?.request 
      ? config.transform.request(config.body)
      : config.body
  }),

  // Transform response before returning
  transformResponse: (response, config) => {
    if (config.transform?.response) {
      return config.transform.response(response);
    }

    // Standard envelope format
    return {
      data: response.data,
      meta: {
        timestamp: Date.now(),
        service: config.serviceName,
        version: config.version
      }
    };
  }
};
```

## Advanced Configuration

### Authentication Integration

```javascript
// middleware/auth.js
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Validate with auth service
    const authResponse = await fetch(`${AUTH_SERVICE_URL}/validate`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!authResponse.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await authResponse.json();
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Auth validation failed' });
  }
};
```

### Service Discovery

```javascript
// services/discovery.js
class ServiceDiscovery {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
  }

  async registerService(name, instances) {
    this.services.set(name, instances);
    this.startHealthCheck(name, instances);
  }

  async discoverService(name) {
    const instances = this.services.get(name) || [];
    return instances.filter(instance => instance.healthy);
  }

  startHealthCheck(serviceName, instances) {
    const checkInterval = setInterval(async () => {
      for (const instance of instances) {
        try {
          const response = await fetch(`${instance.url}/health`);
          instance.healthy = response.ok;
        } catch (error) {
          instance.healthy = false;
        }
      }
    }, 30000); // Check every 30 seconds

    this.healthChecks.set(serviceName, checkInterval);
  }
}
```

### Caching Layer

```javascript
// middleware/cache.js
const Redis = require('redis');
const redis = Redis.createClient();

const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `gateway:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Monkey patch res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        redis.setex(cacheKey, ttl, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};
```

## Monitoring & Observability

### Metrics Collection

```javascript
// monitoring/metrics.js
const prometheus = require('prom-client');

const requestDuration = new prometheus.Histogram({
  name: 'gateway_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'route', 'service', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const requestsTotal = new prometheus.Counter({
  name: 'gateway_requests_total',
  help: 'Total number of requests',
  labelNames: ['method', 'route', 'service', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'gateway_active_connections',
  help: 'Number of active connections',
  labelNames: ['service']
});
```

### Distributed Tracing

```javascript
// tracing/tracer.js
const { NodeTracer } = require('@opentelemetry/node');
const { ConsoleSpanExporter } = require('@opentelemetry/tracing');
const { SimpleSpanProcessor } = require('@opentelemetry/tracing');

const tracer = new NodeTracer({
  plugins: {
    http: {
      enabled: true,
    },
    express: {
      enabled: true,
    },
  },
});

tracer.addSpanProcessor(
  new SimpleSpanProcessor(new ConsoleSpanExporter())
);

tracer.start();
```

## Deployment Examples

### Kubernetes Deployment

```yaml
# k8s/gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: gateway
        image: knowledgepack/api-gateway:latest
        ports:
        - containerPort: 8080
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
spec:
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  api-gateway:
    build: .
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - redis
      - prometheus

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

## Performance Testing

```javascript
// tests/load-test.js
const autocannon = require('autocannon');

const runLoadTest = async () => {
  const result = await autocannon({
    url: 'http://localhost:8080',
    connections: 100,
    pipelining: 1,
    duration: 30,
    requests: [
      {
        method: 'GET',
        path: '/api/users',
        headers: {
          'authorization': 'Bearer test-token'
        }
      }
    ]
  });

  console.log('Load test results:', result);
};

runLoadTest();
```

## Next Steps

1. **[📊 Monitoring Setup](api-gateway-monitoring)** - Advanced monitoring configuration
2. **[🔒 Security Hardening](api-gateway-security)** - Security best practices
3. **[⚡ Performance Tuning](api-gateway-performance)** - Optimization guide

---

*Scale your microservices with confidence using our API Gateway pack.*
