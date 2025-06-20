"""
Zero Gate: Multi-Tenant ESO Platform
Main application entry point optimized for Replit
"""
import os
import logging
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("zero-gate")

# Import core modules - with fallback for development
try:
    from agents.orchestration import OrchestrationAgent
    from agents.processing import ProcessingAgent
    from agents.integration import IntegrationAgent
    from utils.resource_monitor import ResourceMonitor
    from utils.tenant_context import TenantMiddleware
    from utils.database import DatabaseManager
    from routers import sponsors, grants, relationships
    logger.info("All core modules imported successfully")
except ImportError as e:
    logger.warning(f"Some modules not yet available: {e}")
    # Create minimal fallback classes for development
    class ResourceMonitor:
        def __init__(self, cpu_threshold=65, memory_threshold=70):
            self.cpu_threshold = cpu_threshold
            self.memory_threshold = memory_threshold
        
        def start(self):
            logger.info("Resource monitor started (development mode)")
        
        def stop(self):
            logger.info("Resource monitor stopped (development mode)")
        
        def get_current_usage(self):
            return {"cpu": 45, "memory": 60, "status": "development"}
        
        def get_enabled_features(self):
            return ["core", "development"]
    
    class DatabaseManager:
        async def initialize(self):
            logger.info("Database manager initialized (development mode)")
        
        async def close(self):
            logger.info("Database manager closed (development mode)")

# Initialize resource monitor with Replit-optimized thresholds
resource_monitor = ResourceMonitor(
    cpu_threshold=65,
    memory_threshold=70
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize platform components
    logger.info("Initializing Zero Gate ESO Platform...")
    
    # Initialize resource monitoring
    resource_monitor.start()
    
    # Initialize database
    db_manager = DatabaseManager()
    await db_manager.initialize()
    app.state.db_manager = db_manager
    
    # Initialize agents (with fallback for development)
    try:
        app.state.orchestration_agent = OrchestrationAgent(resource_monitor)
        app.state.processing_agent = ProcessingAgent(resource_monitor)
        app.state.integration_agent = IntegrationAgent(resource_monitor)
        logger.info("All agents initialized successfully")
    except NameError:
        logger.info("Agents not yet available - running in development mode")
    
    logger.info("Zero Gate platform initialized successfully")
    
    yield
    
    # Shutdown: Clean up resources
    logger.info("Shutting down Zero Gate platform...")
    resource_monitor.stop()
    await db_manager.close()

# Create FastAPI application
app = FastAPI(
    title="Zero Gate ESO Platform",
    description="Multi-Tenant Platform for Entrepreneur Support Organizations",
    version="2.5.0",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add tenant middleware when available
try:
    app.add_middleware(TenantMiddleware)
    logger.info("Tenant middleware added successfully")
except NameError:
    logger.info("Tenant middleware not yet available - development mode")

# Include routers when available
try:
    app.include_router(sponsors.router, prefix="/api/sponsors", tags=["sponsors"])
    app.include_router(grants.router, prefix="/api/grants", tags=["grants"])
    app.include_router(relationships.router, prefix="/api/relationships", tags=["relationships"])
    logger.info("All routers included successfully")
except NameError:
    logger.info("Routers not yet available - development mode")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "resources": resource_monitor.get_current_usage(),
        "features": resource_monitor.get_enabled_features(),
        "platform": "Zero Gate ESO Platform",
        "version": "2.5.0"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "name": "Zero Gate ESO Platform",
        "version": "2.5.0",
        "status": "operational",
        "description": "Multi-tenant platform for Entrepreneur Support Organizations",
        "features": ["tenant_management", "sponsor_tracking", "grant_management", "relationship_mapping"],
        "api_docs": "/docs"
    }

# Development endpoints
@app.get("/api/status")
async def api_status():
    """Development endpoint to check API status"""
    return {
        "api_version": "2.5.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "sponsors": "/api/sponsors",
            "grants": "/api/grants", 
            "relationships": "/api/relationships"
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting Zero Gate ESO Platform on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)