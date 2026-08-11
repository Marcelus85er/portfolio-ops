import psycopg
import os
import tempfile
import requests
import traceback
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from langchain_docling.loader import DoclingLoader, ExportType
from agent import run_bot

app = FastAPI(title="Multi-Tenant AI Engine with Guardrails & Ingestion")
DB_URI = os.getenv("DATABASE_URL", "postgresql://admin:supersecurepassword123@postgres:5432/portfoliodb?sslmode=disable")

class ChatRequest(BaseModel):
    thread_id: str
    tenant_id: str
    message: str

class ApprovalRequest(BaseModel):
    thread_id: str
    tenant_id: str
    action: str  # 'APPROVE', 'EDIT', 'REJECT'
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
        print("\n--- FATAL AGENT ERROR TRACEBACK ---")
        traceback.print_exc()
        print("-----------------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/approve")
async def approve_endpoint(req: ApprovalRequest):
    try:
        if req.action == "REJECT":
            return {"status": "REJECTED", "reply": "Response rejected by human clerk."}
        
        resume_payload = {
            "action": req.action,
            "edited_reply": req.edited_reply if req.action == "EDIT" else None
        }
        return await run_bot(req.thread_id, "", req.tenant_id, resume_data=resume_payload)
    except Exception as e:
        print("\n--- FATAL AGENT ERROR TRACEBACK ---")
        traceback.print_exc()
        print("-----------------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tenant/documents")
async def ingest_tenant_document(req: DocumentInginingRequest):
    """Endpoint for Clerks/Tenants to push official PDFs into permanent memory and asset storage."""
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
                conn.commit()
                
        return {"status": "SUCCESS", "document_id": doc_id, "message": "Document indexed into tenant memory."}
    except Exception as e:
        print("\n--- INGESTION ERROR TRACEBACK ---")
        traceback.print_exc()
        print("---------------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))