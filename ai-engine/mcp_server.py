import os
import sys
import tempfile
import requests
import logging
import psycopg
import warnings
from psycopg.rows import dict_row
from mcp.server.fastmcp import FastMCP
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_docling.loader import DoclingLoader, ExportType

# --- STRICT STREAM PROTECTION ---
warnings.filterwarnings("ignore")
logging.basicConfig(stream=sys.stderr, level=logging.CRITICAL)

mcp = FastMCP("MultiTenant_Tools")
DB_URI = os.getenv("DATABASE_URL", "postgresql://admin:supersecurepassword123@postgres:5432/portfoliodb?sslmode=disable")

@mcp.tool()
def search_inventory(tenant_id: str, make: str = None, budget_max: int = None) -> list[dict]:
    """Search dealership inventory for vehicles matching criteria. 
    If make or budget_max are omitted, returns all available vehicles for the tenant.
    """
    query = "SELECT id, make, model, price, status FROM inventory WHERE tenant_id = %s AND status = 'Available'"
    params = [tenant_id]
    
    if make:
        query += " AND make ILIKE %s"
        params.append(f"%{make}%")
    if budget_max is not None and budget_max > 0:
        query += " AND price <= %s"
        params.append(budget_max)
        
    query += " ORDER BY price ASC"
    
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, tuple(params))
            results = cur.fetchall()
            return results if results else [{"message": "No available vehicles match this criteria in our inventory."}]

@mcp.tool()
def apply_discount(vehicle_id: int, discount_amount: int, tenant_id: str) -> dict:
    """Applies a custom discount quote to a vehicle. HIGH RISK: Requires human authorization."""
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT price FROM inventory WHERE id = %s AND tenant_id = %s", (vehicle_id, tenant_id))
            row = cur.fetchone()
            if not row:
                return {"error": "Vehicle not found."}
            return {"status": "DISCOUNT_APPLIED", "original_price": float(row[0]), "new_price": float(row[0]) - discount_amount}

@mcp.tool()
def read_caller_pdf(pdf_url: str, tenant_id: str) -> dict:
    """Extracts text from a customer-uploaded PDF for TEMPORARY context during this chat. NEVER indexed into memory."""
    try:
        response = requests.get(pdf_url, stream=True)
        if response.status_code != 200:
            return {"error": f"Failed to download PDF. Status: {response.status_code}"}
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            for chunk in response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            tmp_path = tmp_file.name
        
        loader = DoclingLoader(file_path=tmp_path, export_type=ExportType.MARKDOWN)
        docs = loader.load()
        full_text = "\n\n".join([doc.page_content for doc in docs])
        os.remove(tmp_path)
        
        return {
            "status": "success",
            "ephemeral_context": full_text,
            "note": "This context is temporary for this session and not stored in memory."
        }
    except Exception as e:
        return {"error": f"Failed to read caller PDF: {str(e)}"}

@mcp.tool()
def search_tenant_documents(query: str, tenant_id: str) -> list[dict]:
    """Search tenant's permanent document library (brochures, spec sheets, official quotes) to share assets with callers."""
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT title, file_url, content FROM tenant_documents WHERE tenant_id = %s AND (title ILIKE %s OR content ILIKE %s) LIMIT 3",
                (tenant_id, f"%{query}%", f"%{query}%")
            )
            results = cur.fetchall()
            return results if results else [{"error": "No official tenant documents match your search query."}]

if __name__ == "__main__":
    mcp.run(transport="stdio")