from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import engine, Base, AsyncSessionLocal

# Import all models so Alembic/Base.metadata sees them
import auth.models  # noqa: F401
import campaigns.models  # noqa: F401
import events.models  # noqa: F401
import analytics.models  # noqa: F401
import employees.models  # noqa: F401

# Routers
from auth.routes import router as auth_router
from campaigns.routes import router as campaigns_router
from simulation.routes import router as simulation_router
from analytics.routes import router as analytics_router
from admin.routes import router as admin_router
from templates.routes import router as templates_router
from ai_generation.routes import router as ai_router
from drills.routes import router as drills_router
from events.ws_manager import get_broadcaster, set_broadcaster

# Optional: RAG chatbot (may not have deps installed)
try:
    from rag_chatbot.main import router as chat_router
    _has_chatbot = True
except ImportError:
    _has_chatbot = False

settings = get_settings()


from database import AsyncSessionLocal

@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        from init_db import initialize_database
        async with AsyncSessionLocal() as session:
            await initialize_database(session)

        set_broadcaster(get_broadcaster())
        yield
    except (asyncio.CancelledError, KeyboardInterrupt):
        # Handle graceful shutdown on Ctrl+C or process cancellation
        pass
    finally:
        await engine.dispose()


app = FastAPI(
    title="Breach — Phishing Simulation Platform",
    description=(
        "Multi-channel phishing simulation API: **Email**, **SMS (Smishing)**, and **WhatsApp**. "
        "Run awareness campaigns, track link clicks and credential attempts, and view analytics by channel. "
        "Campaigns support `channel_type`: EMAIL, SMS, WHATSAPP. "
        "Use message templates (GET/POST /campaigns/templates/list and /campaigns/templates) for SMS/WhatsApp body with `{{link}}`. "
        "Analytics: GET /analytics/channel-performance for click rates by channel. "
        "Live events: WebSocket /ws/events for real-time { user, channel, event, campaign }. "
        "Set SIMULATION_MODE=true to log messages instead of sending real SMS/WhatsApp."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router,       prefix="/auth",       tags=["Auth"])
app.include_router(campaigns_router,  prefix="/campaigns",  tags=["Campaigns"])
app.include_router(simulation_router, prefix="/sim",        tags=["Simulation"])
app.include_router(analytics_router,  prefix="/analytics",  tags=["Analytics"])
app.include_router(admin_router,      prefix="/admin",      tags=["Admin"])
app.include_router(templates_router,  prefix="/templates",  tags=["Templates"])
app.include_router(ai_router,         prefix="/ai",         tags=["AI Gen"])
app.include_router(drills_router,     prefix="/drills",     tags=["Drills"])
if _has_chatbot:
    app.include_router(chat_router,   prefix="/chat",       tags=["Chatbot"])


@app.websocket("/ws/events")
async def websocket_live_events(websocket: WebSocket):
    """Live event stream: clients receive { user, channel, event, campaign } when events occur."""
    broadcaster = get_broadcaster()
    await broadcaster.connect(websocket)
    try:
        # Send recent events on connect (optional)
        from sqlalchemy import select, desc
        from events.models import Event
        from campaigns.models import Campaign
        from auth.models import User
        async with AsyncSessionLocal() as db:
            r = await db.execute(select(Event).order_by(desc(Event.timestamp)).limit(20))
            events = r.scalars().all()
            for e in events:
                campaign = await db.get(Campaign, e.campaign_id) if e.campaign_id else None
                user = await db.get(User, e.user_id) if e.user_id else None
                ch = "EMAIL"
                if campaign and getattr(campaign, "channel_type", None):
                    ch = campaign.channel_type.value
                payload = {
                    "user": user.email if user else None,
                    "channel": ch,
                    "event": e.event_type.value,
                    "campaign": campaign.name if campaign else None,
                }
                await websocket.send_text(__import__("json").dumps(payload, default=str))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
