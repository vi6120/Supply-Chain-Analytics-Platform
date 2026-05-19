from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq
from api.database import get_connection, clean



router = APIRouter(prefix="/ai", tags=["AI Advisor"])

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


class QuestionRequest(BaseModel):
    question: str


def build_context(con) -> str:
    inventory = clean(con.execute("""
        SELECT material_id, plant, current_stock, days_of_supply,
               stock_status, avg_daily_consumption
        FROM main_gold.gold_inventory_kpis
        ORDER BY days_of_supply ASC NULLS LAST
        LIMIT 15
    """).df().to_dict(orient="records"))

    reorder = clean(con.execute("""
        SELECT material_id, plant, current_stock, reorder_point,
               days_until_stockout, reorder_recommendation
        FROM main_gold.gold_reorder_alerts
        ORDER BY current_stock ASC
        LIMIT 10
    """).df().to_dict(orient="records"))

    suppliers = clean(con.execute("""
        SELECT vendor_id, overall_fulfillment_pct, overdue_pct,
               vendor_score, vendor_rating
        FROM main_gold.gold_supplier_performance
        ORDER BY vendor_score DESC
    """).df().to_dict(orient="records"))

    financial = clean(con.execute("""
        SELECT material_id, total_revenue, gross_margin_pct,
               inventory_value, carrying_cost_period, margin_category
        FROM main_gold.gold_financial_summary
        ORDER BY inventory_value DESC
        LIMIT 10
    """).df().to_dict(orient="records"))

    risk = clean(con.execute("""
        SELECT material_id, vendor_count, is_single_source,
               perfect_order_rate, supply_risk_score, risk_category
        FROM main_gold.gold_supply_risk
        ORDER BY supply_risk_score DESC
    """).df().to_dict(orient="records"))

    demand = clean(con.execute("""
        SELECT material_id, avg_daily_demand, peak_daily_demand,
               overall_fulfillment_pct, demand_category
        FROM main_gold.gold_demand_signals
        ORDER BY avg_daily_demand DESC
        LIMIT 10
    """).df().to_dict(orient="records"))

    return f"""
INVENTORY STATUS:
{inventory}

REORDER ALERTS:
{reorder}

SUPPLIER PERFORMANCE:
{suppliers}

FINANCIAL SUMMARY:
{financial}

SUPPLY RISK:
{risk}

DEMAND SIGNALS:
{demand}
"""


_WRITE_KEYWORDS = (
    "update", "insert", "delete", "create", "modify", "change", "set",
    "write", "edit", "add", "remove", "patch", "replace", "drop", "alter",
)


@router.post("/ask")
def ask_advisor(body: QuestionRequest):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    q = body.question.lower()
    if any(kw in q.split() for kw in _WRITE_KEYWORDS):
        return {
            "answer": "I don't have permission to write, modify, or delete data from the dashboard. I can only read and analyse the existing supply chain data.",
            "model": None,
            "question": body.question,
        }
    try:
        con = get_connection()
        context = build_context(con)
        con.close()

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are a read-only expert supply chain analyst with deep knowledge 
of inventory management, procurement, demand planning, and supplier performance. 
You have access to real supply chain data from the user's pipeline.

IMPORTANT: You are strictly read-only. You cannot and must not write, update, 
insert, delete, or modify any data or models. If asked to do so, clearly state 
that you do not have permission to write data from the dashboard.

When answering:
- Be specific and reference actual data values from the context
- Prioritise actionable recommendations
- Flag risks clearly
- Keep answers concise — 3 to 5 sentences unless more detail is needed
- Format numbers clearly (e.g. €1.2M, 94.5%, 30 days)"""
                },
                {
                    "role": "user",
                    "content": f"""Here is the current state of the supply chain:

{context}

Question: {body.question}"""
                }
            ],
            temperature=0.3,
            max_tokens=500,
        )

        return {
            "answer":   response.choices[0].message.content,
            "model":    response.model,
            "question": body.question,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
