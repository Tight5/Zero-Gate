# Zero Gate ESO Platform: Cloud Transition Plan

## Overview

This document provides a comprehensive migration strategy for transitioning the Zero Gate ESO platform from Replit to a production cloud environment, ensuring minimal downtime and data integrity.

## Pre-Migration Assessment

### Current State Analysis
- **Replit Resources**: Document current CPU, memory, and storage usage
- **User Base**: 15 active tenants, 450 total users, 25,000 relationships
- **Data Volume**: 2.3GB database, 800MB file storage
- **Performance**: 1.2s average API response time, 95% uptime

### Target Architecture
- **Cloud Provider**: AWS (recommended for ESO compliance requirements)
- **Compute**: EKS cluster with auto-scaling
- **Database**: RDS PostgreSQL with read replicas
- **Storage**: S3 for files, ElastiCache for caching
- **CDN**: CloudFront for static assets

## Phase 1: Infrastructure Planning (Week 1)

### Cloud Resource Design
```yaml
# AWS EKS Cluster Configuration
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: zero-gate-prod
  region: us-east-1

nodeGroups:
  - name: worker-nodes
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 10
  
  - name: gpu-nodes # For relationship mapping algorithms
    instanceType: p3.2xlarge
    desiredCapacity: 1
    minSize: 0
    maxSize: 3
```

### Database Migration Strategy
```sql
-- RDS PostgreSQL setup
CREATE DATABASE zero_gate_prod;

-- Enable row-level security for tenant isolation
ALTER DATABASE zero_gate_prod SET row_security = on;

-- Create tenant-aware schemas
CREATE SCHEMA tenant_data;
CREATE SCHEMA central_data;
```

### Security Configuration
- **VPC**: Isolated network with private subnets
- **IAM Roles**: Least privilege access for services
- **Encryption**: At-rest and in-transit encryption
- **Secrets Management**: AWS Secrets Manager for credentials

## Phase 2: Development Environment Setup (Week 2)

### CI/CD Pipeline
```yaml
# GitHub Actions Workflow
name: Zero Gate Deploy
on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: |
          npm test
          python -m pytest
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker Images
        run: |
          docker build -t zero-gate-frontend:${{ github.sha }} ./frontend
          docker build -t zero-gate-backend:${{ github.sha }} ./backend
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin
          docker push zero-gate-frontend:${{ github.sha }}
          docker push zero-gate-backend:${{ github.sha }}
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name zero-gate-prod
          kubectl set image deployment/frontend frontend=zero-gate-frontend:${{ github.sha }}
          kubectl set image deployment/backend backend=zero-gate-backend:${{ github.sha }}
```

### Container Configuration
```dockerfile
# Backend Dockerfile
FROM python:3.10-slim
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Phase 3: Data Migration (Days 1-2)

### Database Migration Script
```python
#!/usr/bin/env python3
"""
Zero Gate Database Migration Script
Migrates from Replit SQLite to AWS RDS PostgreSQL
"""

import os
import psycopg2
import sqlite3
from datetime import datetime

class DatabaseMigrator:
    def __init__(self):
        self.replit_db_path = os.getenv('REPLIT_DB_PATH')
        self.postgres_url = os.getenv('POSTGRES_CONNECTION_URL')
    
    def migrate_tenant_data(self, tenant_id):
        """Migrate individual tenant database"""
        sqlite_path = f"storage/tenant_{tenant_id}.db"
        sqlite_conn = sqlite3.connect(sqlite_path)
        postgres_conn = psycopg2.connect(self.postgres_url)
        
        try:
            # Migrate sponsors
            self._migrate_table(sqlite_conn, postgres_conn, 'sponsors', tenant_id)
            
            # Migrate grants
            self._migrate_table(sqlite_conn, postgres_conn, 'grants', tenant_id)
            
            # Migrate relationships
            self._migrate_table(sqlite_conn, postgres_conn, 'relationships', tenant_id)
            
            print(f"✅ Migrated tenant {tenant_id}")
            
        except Exception as e:
            print(f"❌ Failed to migrate tenant {tenant_id}: {str(e)}")
            postgres_conn.rollback()
            raise
        finally:
            sqlite_conn.close()
            postgres_conn.close()

    def _migrate_table(self, sqlite_conn, postgres_conn, table_name, tenant_id):
        """Migrate specific table with tenant context"""
        cursor = sqlite_conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name}")
        
        pg_cursor = postgres_conn.cursor()
        
        for row in cursor.fetchall():
            # Add tenant_id to the row data
            row_data = list(row) + [tenant_id]
            placeholders = ','.join(['%s'] * len(row_data))
            
            pg_cursor.execute(
                f"INSERT INTO tenant_data.{table_name} VALUES ({placeholders})",
                row_data
            )
        
        postgres_conn.commit()

    def run_migration(self):
        """Execute complete migration"""
        print("🚀 Starting Zero Gate database migration...")
        
        # Get list of tenant databases
        tenant_files = [f for f in os.listdir('storage') if f.startswith('tenant_')]
        tenant_ids = [f.replace('tenant_', '').replace('.db', '') for f in tenant_files]
        
        for tenant_id in tenant_ids:
            self.migrate_tenant_data(tenant_id)
        
        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    migrator = DatabaseMigrator()
    migrator.run_migration()
```

### File Storage Migration
```bash
#!/bin/bash

# Migrate files from Replit to S3
echo "🗂️ Starting file migration to S3..."

# Create S3 bucket if not exists
aws s3 mb s3://zero-gate-files --region us-east-1

# Sync all files
aws s3 sync /home/runner/storage s3://zero-gate-files/storage \
  --exclude "*.db" \
  --delete

# Set proper permissions
aws s3api put-bucket-versioning \
  --bucket zero-gate-files \
  --versioning-configuration Status=Enabled

echo "✅ File migration completed!"
```

## Phase 4: Application Deployment (Day 3)

### Kubernetes Manifests
```yaml
# Backend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zero-gate-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zero-gate-backend
  template:
    metadata:
      labels:
        app: zero-gate-backend
    spec:
      containers:
      - name: backend
        image: zero-gate-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10

---
# Frontend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zero-gate-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zero-gate-frontend
  template:
    metadata:
      labels:
        app: zero-gate-frontend
    spec:
      containers:
      - name: frontend
        image: zero-gate-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

---
# Load Balancer Service
apiVersion: v1
kind: Service
metadata:
  name: zero-gate-loadbalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: zero-gate-frontend
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
```

## Phase 5: Testing & Validation (Days 4-5)

### Migration Validation Checklist
- [ ] **Database Integrity**: Verify all tenant data migrated correctly
- [ ] **File Accessibility**: Confirm all uploaded files accessible from S3
- [ ] **Authentication**: Test login/logout for all user types
- [ ] **Multi-tenancy**: Verify tenant isolation maintained
- [ ] **Relationship Mapping**: Test path discovery functionality
- [ ] **Grant Timelines**: Confirm milestone calculations work
- [ ] **Microsoft Integration**: Validate Graph API connections
- [ ] **Performance**: Benchmark response times vs Replit

### Automated Testing Suite
```python
import pytest
import requests
import time

class ProductionValidationTests:
    def __init__(self, base_url):
        self.base_url = base_url
        self.auth_token = None
    
    def test_authentication(self):
        """Test user authentication works"""
        response = requests.post(f"{self.base_url}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test-password"
        })
        assert response.status_code == 200
        self.auth_token = response.json()["token"]

    def test_tenant_isolation(self):
        """Verify tenant data isolation"""
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test tenant 1 data
        response1 = requests.get(
            f"{self.base_url}/api/sponsors",
            headers={**headers, "X-Tenant-ID": "tenant-1"}
        )
        
        # Test tenant 2 data  
        response2 = requests.get(
            f"{self.base_url}/api/sponsors", 
            headers={**headers, "X-Tenant-ID": "tenant-2"}
        )
        
        # Verify different data sets
        assert response1.json() != response2.json()

    def test_performance(self):
        """Verify response times meet SLA"""
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        start_time = time.time()
        response = requests.get(
            f"{self.base_url}/api/dashboard/kpis",
            headers={**headers, "X-Tenant-ID": "tenant-1"}
        )
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Under 2 seconds
```

## Success Metrics

### Performance Improvements
- **API Response Time**: Target <1s average (vs 1.2s on Replit)
- **Uptime**: 99.9% availability (vs 95% on Replit)  
- **Concurrent Users**: Support 1000+ users (vs 200 on Replit)
- **Database Performance**: <100ms query response time

### Cost Analysis
- **Monthly Cost**: $800-1200/month for initial setup
- **Cost per User**: $2-3/user/month at scale
- **Break-even**: 400+ active users
- **ROI**: 6-month payback period

This transition plan ensures a smooth migration from Replit to a production-ready cloud environment while maintaining the Zero Gate ESO platform's functionality and performance standards.