from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from agent import run_bot

app = FastAPI(title="Multi-Tenant AI Engine with HITL")

class ChatRequest(BaseModel):
    thread_id: str
    tenant_id: str
    message: str

class ApprovalRequest(BaseModel):
    thread_id: str
    tenant_id: str
    action: str  # 'APPROVE', 'EDIT', 'REJECT'
    edited_reply: Optional[str] = None

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        return await run_bot(req.thread_id, req.message, req.tenant_id)
    except Exception as e:
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
        raise HTTPException(status_code=500, detail=str(e))