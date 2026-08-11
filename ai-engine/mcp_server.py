import os
import tempfile
import requests
import logging
import psycopg
from psycopg.rows import dict_row
from mcp.server.fastmcp import FastMCP
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_community.document_loaders import PyPDFLoader

mcp = FastMCP("MultiTenant_Tools")
DB_URI = os.getenv("DATABASE_URL", "postgresql://user:pass@postgres:5432/portfolio?sslmode=disable")

@mcp.tool()
def search_inventory(make: str, budget_max: int, tenant_id: str) -> list[dict]:
    """Search the dealership inventory for vehicles matching the user's budget and preferred make."""
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT make, model, price, status FROM inventory WHERE tenant_id = %s AND make ILIKE %s AND price <= %s AND status = 'Available'", 
                (tenant_id, f"%{make}%", budget_max)
            )
            results = cur.fetchall()
            return results if results else [{"error": "No available vehicles match this criteria."}]

@mcp.tool()
def apply_discount(vehicle_id: int, discount_amount: int, tenant_id: str) -> dict:
    """Applies a custom discount quote to a vehicle. HIGH RISK TOOL: Requires human clerk authorization."""
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT price FROM inventory WHERE id = %s AND tenant_id = %s", (vehicle_id, tenant_id))
            row = cur.fetchone()
            if not row:
                return {"error": "Vehicle not found."}
            return {"status": "DISCOUNT_APPLIED", "original_price": float(row[0]), "new_price": float(row[0]) - discount_amount}

@mcp.tool()
def process_infographic(image_url: str, tenant_id: str) -> dict:
    """Processes an infographic URL stored in MinIO using GPT-4o Vision, extracts its full text/data."""
    logging.info(f"Processing infographic for Tenant: {tenant_id}")
    vision_llm = ChatOpenAI(model="gpt-4o")
    
    message = HumanMessage(
        content=[
            {"type": "text", "text": "Extract all data, pricing, text, and visual context from this infographic into a detailed summary."},
            {"type": "image_url", "image_url": {"url": image_url}},
        ]
    )
    analysis = vision_llm.invoke([message])
    return {"status": "success", "extracted_text": analysis.content, "stored_image_url": image_url}

@mcp.tool()
def process_pdf(pdf_url: str, tenant_id: str) -> dict:
    """Downloads a PDF document from a URL and extracts all text for ingestion."""
    logging.info(f"Processing PDF for Tenant: {tenant_id}")
    try:
        response = requests.get(pdf_url, stream=True)
        if response.status_code != 200:
            return {"error": f"Failed to download PDF. Status: {response.status_code}"}
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            for chunk in response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            tmp_path = tmp_file.name
        
        loader = PyPDFLoader(tmp_path)
        pages = loader.load()
        full_text = "\n\n".join([f"--- Page {i+1} ---\n{page.page_content}" for i, page in enumerate(pages)])
        
        os.remove(tmp_path)
        
        return {
            "status": "success",
            "pages_extracted": len(pages),
            "text_preview": full_text[:500] + "...", 
            "full_extracted_text": full_text
        }
    except Exception as e:
        return {"error": f"Failed to process PDF: {str(e)}"}

if __name__ == "__main__":
    mcp.run(transport="stdio")