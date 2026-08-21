import psycopg
import os
import tempfile
import requests
import traceback
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from langchain_docling.loader import DoclingLoader, ExportType
from agent import run_bot

app = FastAPI(title="Multi-Tenant AI Engine with Guardrails & Management APIs")
DB_URI = os.getenv("DATABASE_URL", "postgresql://admin:supersecurepassword123@postgres:5432/portfoliodb?sslmode=disable")

class ChatRequest(BaseModel):
    thread_id: str
    tenant_id: str
    message: str

class ApprovalRequest(BaseModel):
    thread_id: str
    tenant_id: str
    action: str 
    edited_reply: Optional[str] = None

class DocumentInginingRequest(BaseModel):
    tenant_id: str
    title: str
    file_url: str

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        return await run_bot(req.thread_id, req.message, req.tenant_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/approve")
async def approve_endpoint(req: ApprovalRequest):
    try:
        if req.action == "REJECT":
            return {"status": "REJECTED", "reply": "Response rejected by human clerk."}
        resume_payload = {"action": req.action, "edited_reply": req.edited_reply if req.action == "EDIT" else None}
        return await run_bot(req.thread_id, "", req.tenant_id, resume_data=resume_payload)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tenant/documents")
async def ingest_tenant_document(req: DocumentInginingRequest):
    try:
        response = requests.get(req.file_url, stream=True)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to download file from provided URL.")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            for chunk in response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            tmp_path = tmp_file.name
        
        loader = DoclingLoader(file_path=tmp_path, export_type=ExportType.MARKDOWN)
        docs = loader.load()
        full_text = "\n\n".join([doc.page_content for doc in docs])
        os.remove(tmp_path)
        
        with psycopg.connect(DB_URI) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO tenant_documents (tenant_id, title, file_url, content) VALUES (%s, %s, %s, %s) RETURNING id",
                    (req.tenant_id, req.title, req.file_url, full_text)
                )
                doc_id = cur.fetchone()[0]
        return {"status": "SUCCESS", "document_id": doc_id, "message": "Document indexed."}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW ADMIN APIs ---

@app.get("/tenant/{tenant_id}/documents")
async def list_documents(tenant_id: str):
    """View all indexed documents for a specific tenant."""
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id, title, file_url, created_at FROM tenant_documents WHERE tenant_id = %s", (tenant_id,))
            return {"documents": cur.fetchall()}

@app.delete("/tenant/documents/{doc_id}")
async def delete_document(doc_id: int):
    """Delete an outdated PDF from the bot's memory to prevent hallucinated quotes."""
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tenant_documents WHERE id = %s", (doc_id,))
        return {"status": "DELETED", "document_id": doc_id}

@app.delete("/memory/{thread_id}")
async def purge_thread_memory(thread_id: str):
    """Hard-delete corrupted tool/chat states to reset a customer's conversation."""
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM checkpoints WHERE thread_id = %s", (thread_id,))
            cur.execute("DELETE FROM checkpoint_blobs WHERE thread_id = %s", (thread_id,))
            cur.execute("DELETE FROM checkpoint_writes WHERE thread_id = %s", (thread_id,))
        return {"status": "PURGED", "thread_id": thread_id}