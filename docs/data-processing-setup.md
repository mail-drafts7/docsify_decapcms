---
title: "Real-time Data Processing Pack - Technical Setup Guide"
description: "Developer guide for implementing streaming data processing platform"
order: 6
category: "docs"
---

# 🔧 Real-time Data Processing Pack - Technical Setup Guide

> **High-Performance Streaming Analytics Implementation**

## Architecture Overview

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Data Sources│  │   Ingestion │  │  Processing │  │   Storage   │  │   Output    │
│             │  │             │  │             │  │             │  │             │
│ - APIs      │◄►│   Kafka     │◄►│   Flink     │◄►│ TimescaleDB │◄►│ Dashboard   │
│ - DBs       │  │             │  │             │  │             │  │             │
│ - Files     │  │ Kafka       │  │ Apache      │  │ Elasticsearch│  │ Alerts      │
│ - IoT       │  │ Connect     │  │ Spark       │  │             │  │             │
│ - Streams   │  │             │  │             │  │ Redis       │  │ APIs        │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
      │                │                │                │                │
      └────────────────┼────────────────┼────────────────┼────────────────┘
                      ML Models    Schema Registry   Monitoring Stack
```

## Quick Start (15 minutes)

### 1. Installation

```bash
# Clone the data processing pack
git clone https://github.com/knowledgepack/data-processing-pack.git
cd data-processing-pack

# Start all services with Docker Compose
docker-compose up -d

# Or install individual components
./scripts/install-kafka.sh
./scripts/install-flink.sh
./scripts/install-monitoring.sh
```

### 2. Environment Configuration

```bash
# Copy and configure environment
cp .env.template .env

cat > .env << EOF
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_ZOOKEEPER=localhost:2181
KAFKA_REPLICATION_FACTOR=1

# Flink Configuration
FLINK_JOB_MANAGER=localhost:8081
FLINK_TASK_MANAGER_SLOTS=4
FLINK_PARALLELISM=2

# Storage Configuration
TIMESCALE_CONNECTION=postgresql://user:pass@localhost:5432/timeseries
ELASTICSEARCH_URL=http://localhost:9200
REDIS_URL=redis://localhost:6379

# Schema Registry
SCHEMA_REGISTRY_URL=http://localhost:8081

# Monitoring
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3000
EOF
```

### 3. Initialize Platform

```bash
# Create Kafka topics
./scripts/create-topics.sh

# Deploy Flink jobs
flink run -d jobs/stream-processor.jar

# Setup schemas
./scripts/register-schemas.sh

# Platform ready at:
# - Flink Dashboard: http://localhost:8081
# - Kafka UI: http://localhost:8080
# - Grafana: http://localhost:3000
```

## Data Ingestion

### Kafka Producer Setup

```python
# producers/event_producer.py
from kafka import KafkaProducer
from kafka.errors import KafkaError
import json
import time

class EventProducer:
    def __init__(self, bootstrap_servers, topic):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: str(k).encode('utf-8'),
            acks='all',
            retries=3,
            batch_size=16384,
            linger_ms=10,
            buffer_memory=33554432
        )
        self.topic = topic

    def send_event(self, key, event_data):
        try:
            # Add timestamp and metadata
            enriched_event = {
                'timestamp': int(time.time() * 1000),
                'event_id': f"{key}_{int(time.time() * 1000)}",
                'data': event_data
            }
            
            future = self.producer.send(
                self.topic, 
                value=enriched_event, 
                key=key
            )
            
            # Wait for delivery confirmation
            record_metadata = future.get(timeout=10)
            return record_metadata
            
        except KafkaError as e:
            print(f"Failed to send event: {e}")
            return None

# Usage example
producer = EventProducer(['localhost:9092'], 'user-events')
producer.send_event('user_123', {
    'action': 'page_view',
    'page': '/dashboard',
    'user_id': 123,
    'session_id': 'sess_abc123'
})
```

### Real-time Data Connectors

```yaml
# connectors/database-source.yml
name: postgres-source-connector
config:
  connector.class: io.debezium.connector.postgresql.PostgresConnector
  database.hostname: localhost
  database.port: 5432
  database.user: postgres
  database.password: password
  database.dbname: production
  database.server.name: prod-db
  table.include.list: public.orders,public.payments
  plugin.name: pgoutput
  transforms: unwrap
  transforms.unwrap.type: io.debezium.transforms.ExtractNewRecordState
```

```javascript
// connectors/api-connector.js
const { Kafka } = require('kafkajs');

class APIConnector {
  constructor(kafkaConfig, apiConfig) {
    this.kafka = Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
    this.apiConfig = apiConfig;
  }

  async start() {
    await this.producer.connect();
    
    // Poll API endpoint every 30 seconds
    setInterval(async () => {
      try {
        const response = await fetch(this.apiConfig.endpoint, {
          headers: this.apiConfig.headers
        });
        
        const data = await response.json();
        
        // Send each record to Kafka
        await this.producer.send({
          topic: this.apiConfig.topic,
          messages: data.map(record => ({
            key: record.id,
            value: JSON.stringify(record),
            timestamp: Date.now()
          }))
        });
        
      } catch (error) {
        console.error('API polling error:', error);
      }
    }, 30000);
  }
}
```

## Stream Processing with Apache Flink

### Basic Stream Processing Job

```java
// jobs/StreamProcessor.java
public class StreamProcessor {
    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Configure checkpointing
        env.enableCheckpointing(30000);
        env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
        
        // Create Kafka source
        KafkaSource<Event> source = KafkaSource.<Event>builder()
            .setBootstrapServers("localhost:9092")
            .setTopics("user-events")
            .setGroupId("stream-processor")
            .setStartingOffsets(OffsetsInitializer.earliest())
            .setValueOnlyDeserializer(new EventDeserializer())
            .build();
            
        DataStream<Event> events = env.fromSource(
            source, 
            WatermarkStrategy.<Event>forBoundedOutOfOrderness(Duration.ofSeconds(10))
                .withTimestampAssigner((event, timestamp) -> event.getTimestamp()),
            "Kafka Source"
        );
        
        // Process events
        DataStream<AlertEvent> alerts = events
            .filter(event -> event.getType().equals("error"))
            .keyBy(Event::getUserId)
            .window(TumblingEventTimeWindows.of(Time.minutes(5)))
            .aggregate(new ErrorAggregator())
            .filter(agg -> agg.getErrorCount() > 10);
            
        // Sink to multiple destinations
        alerts.sinkTo(createKafkaSink("alerts"));
        alerts.sinkTo(createElasticsearchSink());
        
        env.execute("Real-time Stream Processor");
    }
}
```

### Complex Event Processing

```scala
// jobs/ComplexEventProcessor.scala
import org.apache.flink.cep.scala.CEP
import org.apache.flink.cep.scala.pattern.Pattern

object ComplexEventProcessor {
  def main(args: Array[String]): Unit = {
    val env = StreamExecutionEnvironment.getExecutionEnvironment
    
    val events = env
      .addSource(new KafkaSource[Event]("user-events"))
      .assignTimestampsAndWatermarks(...)
    
    // Define pattern: Login -> Multiple failed payments -> Success payment
    val suspiciousPattern = Pattern.begin[Event]("login")
      .where(_.eventType == "login")
      .next("failed_payments")
      .where(_.eventType == "payment_failed")
      .timesOrMore(3)
      .within(Time.minutes(10))
      .next("success_payment")
      .where(_.eventType == "payment_success")
    
    val patternStream = CEP.pattern(events.keyBy(_.userId), suspiciousPattern)
    
    val alerts = patternStream.select((pattern: Map[String, Iterable[Event]]) => {
      FraudAlert(
        userId = pattern("login").head.userId,
        timestamp = System.currentTimeMillis(),
        severity = "HIGH",
        reason = "Suspicious payment pattern detected"
      )
    })
    
    alerts.sinkTo(createAlertSink())
  }
}
```

## Machine Learning Integration

### Online Feature Store

```python
# ml/feature_store.py
import redis
import json
from datetime import datetime, timedelta

class OnlineFeatureStore:
    def __init__(self, redis_client):
        self.redis = redis_client
        
    def update_features(self, user_id, features):
        """Update user features in real-time"""
        feature_key = f"features:user:{user_id}"
        
        # Add timestamp
        features['last_updated'] = datetime.utcnow().isoformat()
        
        # Store with TTL
        self.redis.setex(
            feature_key, 
            timedelta(days=7),
            json.dumps(features)
        )
        
    def get_features(self, user_id):
        """Retrieve user features for ML inference"""
        feature_key = f"features:user:{user_id}"
        features_json = self.redis.get(feature_key)
        
        if features_json:
            return json.loads(features_json)
        return {}
        
    def batch_update_features(self, user_features_dict):
        """Batch update multiple users' features"""
        pipe = self.redis.pipeline()
        
        for user_id, features in user_features_dict.items():
            feature_key = f"features:user:{user_id}"
            features['last_updated'] = datetime.utcnow().isoformat()
            pipe.setex(feature_key, timedelta(days=7), json.dumps(features))
            
        pipe.execute()
```

### Real-time Model Serving

```python
# ml/model_server.py
import joblib
import numpy as np
from kafka import KafkaConsumer, KafkaProducer
import json

class RealTimeModelServer:
    def __init__(self, model_path, kafka_config):
        self.model = joblib.load(model_path)
        self.consumer = KafkaConsumer(
            'ml-inference-requests',
            **kafka_config,
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        self.producer = KafkaProducer(
            **kafka_config,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        
    def serve(self):
        """Serve model predictions in real-time"""
        for message in self.consumer:
            try:
                request = message.value
                
                # Extract features
                features = np.array(request['features']).reshape(1, -1)
                
                # Make prediction
                prediction = self.model.predict(features)[0]
                probability = self.model.predict_proba(features)[0]
                
                # Send response
                response = {
                    'request_id': request['request_id'],
                    'prediction': int(prediction),
                    'probability': probability.tolist(),
                    'timestamp': int(time.time() * 1000)
                }
                
                self.producer.send('ml-inference-responses', response)
                
            except Exception as e:
                print(f"Prediction error: {e}")
```

## Time Series Analytics

### TimescaleDB Integration

```sql
-- Create hypertable for time series data
CREATE TABLE metrics (
    time TIMESTAMPTZ NOT NULL,
    device_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value DOUBLE PRECISION,
    tags JSONB
);

SELECT create_hypertable('metrics', 'time');

-- Create indexes for fast querying
CREATE INDEX idx_metrics_device_time ON metrics (device_id, time DESC);
CREATE INDEX idx_metrics_name_time ON metrics (metric_name, time DESC);
CREATE INDEX idx_metrics_tags ON metrics USING GIN (tags);

-- Continuous aggregates for real-time rollups
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) as bucket,
    device_id,
    metric_name,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value,
    COUNT(*) as count
FROM metrics
GROUP BY bucket, device_id, metric_name;

SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

### Real-time Anomaly Detection

```python
# analytics/anomaly_detector.py
import numpy as np
from scipy import stats
from collections import deque

class StreamingAnomalyDetector:
    def __init__(self, window_size=1000, threshold=3.0):
        self.window_size = window_size
        self.threshold = threshold
        self.window = deque(maxlen=window_size)
        
    def detect(self, value):
        """Detect anomalies in streaming data"""
        self.window.append(value)
        
        if len(self.window) < 30:  # Need minimum samples
            return False, 0.0
            
        # Calculate Z-score
        window_array = np.array(self.window)
        mean = np.mean(window_array)
        std = np.std(window_array)
        
        if std == 0:  # Avoid division by zero
            return False, 0.0
            
        z_score = abs((value - mean) / std)
        is_anomaly = z_score > self.threshold
        
        return is_anomaly, z_score

# Usage in Flink job
class AnomalyDetectionFunction(ProcessFunction):
    def __init__(self):
        self.detector = StreamingAnomalyDetector()
        
    def process_element(self, value, ctx, out):
        is_anomaly, score = self.detector.detect(value.metric_value)
        
        if is_anomaly:
            alert = AnomalyAlert(
                timestamp=value.timestamp,
                metric_name=value.metric_name,
                value=value.metric_value,
                anomaly_score=score,
                severity='HIGH' if score > 5 else 'MEDIUM'
            )
            out.collect(alert)
```

## Deployment & Scaling

### Kubernetes Deployment

```yaml
# k8s/data-platform.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: data-platform-config
data:
  flink.yaml: |
    jobmanager.rpc.address: flink-jobmanager
    taskmanager.numberOfTaskSlots: 4
    parallelism.default: 2
    state.backend: rocksdb
    state.checkpoints.dir: s3://data-platform/checkpoints
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flink-jobmanager
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: jobmanager
        image: apache/flink:1.17-scala_2.12
        ports:
        - containerPort: 8081
        - containerPort: 6123
        env:
        - name: JOB_MANAGER_RPC_ADDRESS
          value: flink-jobmanager
        resources:
          requests:
            memory: 2Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flink-taskmanager
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: taskmanager
        image: apache/flink:1.17-scala_2.12
        env:
        - name: JOB_MANAGER_RPC_ADDRESS
          value: flink-jobmanager
        resources:
          requests:
            memory: 4Gi
            cpu: 2000m
          limits:
            memory: 8Gi
            cpu: 4000m
```

### Performance Monitoring

```python
# monitoring/metrics_collector.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server

# Define metrics
EVENTS_PROCESSED = Counter('events_processed_total', 'Total processed events', ['topic', 'status'])
PROCESSING_LATENCY = Histogram('processing_latency_seconds', 'Processing latency', ['job'])
ACTIVE_WINDOWS = Gauge('active_windows_count', 'Number of active windows', ['operator'])

class MetricsCollector:
    def __init__(self, port=8000):
        start_http_server(port)
        
    def record_event_processed(self, topic, status='success'):
        EVENTS_PROCESSED.labels(topic=topic, status=status).inc()
        
    def record_processing_time(self, job_name, duration_seconds):
        PROCESSING_LATENCY.labels(job=job_name).observe(duration_seconds)
        
    def update_active_windows(self, operator_name, count):
        ACTIVE_WINDOWS.labels(operator=operator_name).set(count)
```

## Testing & Validation

### Stream Processing Tests

```python
# tests/test_stream_processor.py
import unittest
from kafka_test_utils import KafkaTestHarness
from flink_test_utils import FlinkTestHarness

class StreamProcessorTest(unittest.TestCase):
    def setUp(self):
        self.kafka_harness = KafkaTestHarness()
        self.flink_harness = FlinkTestHarness()
        
    def test_event_filtering(self):
        """Test event filtering logic"""
        # Send test events
        test_events = [
            {'type': 'error', 'severity': 'high', 'user_id': 123},
            {'type': 'info', 'severity': 'low', 'user_id': 123},
            {'type': 'error', 'severity': 'critical', 'user_id': 124}
        ]
        
        self.kafka_harness.send_events('input-topic', test_events)
        
        # Wait for processing
        result_events = self.kafka_harness.consume_events('output-topic', timeout=30)
        
        # Verify only error events are passed through
        self.assertEqual(len(result_events), 2)
        for event in result_events:
            self.assertEqual(event['type'], 'error')
            
    def test_windowed_aggregation(self):
        """Test time window aggregation"""
        # Generate events over time window
        self.kafka_harness.send_time_series_events(
            topic='metrics',
            duration_minutes=10,
            events_per_minute=60
        )
        
        # Verify aggregated results
        aggregates = self.kafka_harness.consume_events('aggregated-metrics')
        self.assertGreater(len(aggregates), 0)
        
        for agg in aggregates:
            self.assertIn('window_start', agg)
            self.assertIn('window_end', agg)
            self.assertIn('count', agg)
            self.assertIn('avg_value', agg)
```

## Next Steps

1. **[📊 Advanced Analytics](data-processing-analytics)** - ML pipelines and advanced analytics
2. **[🔍 Monitoring & Alerting](data-processing-monitoring)** - Comprehensive monitoring setup
3. **[⚡ Performance Optimization](data-processing-optimization)** - Tuning for high throughput

---

*Process millions of events per second with our streaming platform.*
