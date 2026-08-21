import os
import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool

from agent import create_graph
from mcp_server import tools

app = FastAPI(title="Agnostic AI Engine API")
DB_URI = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/portfolio")

pool = ConnectionPool(conninfo=DB_URI, max_size=20, kwargs={"autocommit": True})
checkpointer = PostgresSaver(pool)
checkpointer.setup()
graph = create_graph(tools=tools, checkpointer=checkpointer)

class ChatRequest(BaseModel):
    thread_id: str
    tenant_id: str
    message: str

class TenantDocRequest(BaseModel):
    tenant_id: str
    title: str
    content_markdown: str
    file_url: Optional[str] = None

# --- Chat Endpoint ---
@app.post("/chat")
def chat(req: ChatRequest):
    config = {"configurable": {"thread_id": req.thread_id}}
    try:
        final_state = graph.invoke(
            {"messages": [HumanMessage(content=req.message)], "tenant_id": req.tenant_id},
            config=config
        )
        last_msg = final_state["messages"][-1]
        return {"status": "COMPLETED", "reply": last_msg.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Document Lifecycle Management ---
@app.get("/tenant/{tenant_id}/documents")
def list_documents(tenant_id: str):
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT id, title, file_url, created_at FROM tenant_documents WHERE tenant_id = %s", (tenant_id,))
            return {"documents": cur.fetchall()}

@app.post("/tenant/documents")
def add_document(doc: TenantDocRequest):
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "INSERT INTO tenant_documents (tenant_id, title, file_url, content_markdown) VALUES (%s, %s, %s, %s) RETURNING id",
                (doc.tenant_id, doc.title, doc.file_url, doc.content_markdown)
            )
            doc_id = cur.fetchone()["id"]
            return {"status": "SUCCESS", "document_id": doc_id}

@app.delete("/tenant/documents/{doc_id}")
def delete_document(doc_id: int):
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tenant_documents WHERE id = %s", (doc_id,))
            return {"status": "DELETED", "document_id": doc_id}

# --- QA & Observability ---
@app.get("/qa/history/{thread_id}")
def get_thread_history(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    state = graph.get_state(config)
    if not state.values:
        return {"messages": []}
    
    formatted = []
    for msg in state.values.get("messages", []):
        formatted.append({
            "type": msg.type,
            "content": msg.content,
            "additional_kwargs": msg.additional_kwargs
        })
    return {"thread_id": thread_id, "messages": formatted}

# --- Memory Hygiene (Fixing corrupted/stuck threads) ---
@app.delete("/memory/{thread_id}")
def purge_thread_memory(thread_id: str):
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor() as cur:
            # Drop checkpointer checkpoints for this thread
            cur.execute("DELETE FROM checkpoints WHERE thread_id = %s", (thread_id,))
            cur.execute("DELETE FROM checkpoint_blobs WHERE thread_id = %s", (thread_id,))
            cur.execute("DELETE FROM checkpoint_writes WHERE thread_id = %s", (thread_id,))
            return {"status": "PURGED", "thread_id": thread_id}