from api.routers import overview, inventory, procurement, demand, supplier, financial, risk, ai
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

app = FastAPI(
    title="SupplyIQ API",
    description="Supply chain analytics API — powered by DuckDB gold layer",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(overview.router)
app.include_router(inventory.router)
app.include_router(procurement.router)
app.include_router(demand.router)
app.include_router(supplier.router)
app.include_router(financial.router)
app.include_router(risk.router)
app.include_router(ai.router)


@app.get("/health")
def health():
    return {"status": "ok", "message": "SupplyIQ API is running"}
