import os
import psycopg
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.types import interrupt, Command
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.runnables.config import RunnableConfig
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools

DB_URI = os.getenv("DATABASE_URL", "postgresql://user:pass@postgres:5432/portfolio?sslmode=disable")

async def fetch_tenant_config(tenant_id: str):
    async with await psycopg.AsyncConnection.connect(DB_URI) as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT system_prompt, hitl_mode FROM tenants WHERE id = %s", (tenant_id,))
            record = await cur.fetchone()
            return {"prompt": record[0], "hitl_mode": record[1]} if record else {"prompt": "You are a bot.", "hitl_mode": "SAFEGUARDS_ONLY"}

async def log_token_usage(tenant_id: str, thread_id: str, usage: dict, model: str):
    async with await psycopg.AsyncConnection.connect(DB_URI) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO token_billing (tenant_id, thread_id, input_tokens, output_tokens, model_used) VALUES (%s, %s, %s, %s, %s)",
                (tenant_id, thread_id, usage["input_tokens"], usage["output_tokens"], model)
            )
            await conn.commit()

async def run_bot(thread_id: str, message: str, tenant_id: str, resume_data: dict = None) -> dict:
    model_name = "gpt-4o-mini"
    llm = ChatOpenAI(model=model_name, temperature=0.2)
    
    async with MultiServerMCPClient(config={"Tools": {"command": "python", "args": ["mcp_server.py"]}}) as mcp_client:
        tools = await load_mcp_tools(mcp_client)
        llm_with_tools = llm.bind_tools(tools)
        
        async def call_model(state: MessagesState, config: RunnableConfig):
            current_tenant = config["configurable"]["tenant_id"]
            current_thread = config["configurable"]["thread_id"]
            
            tenant_data = await fetch_tenant_config(current_tenant)
            messages = [SystemMessage(content=tenant_data["prompt"])] + state["messages"]
            response = await llm_with_tools.ainvoke(messages)
            
            if response.usage_metadata:
                await log_token_usage(current_tenant, current_thread, response.usage_metadata, model_name)
            
            # --- FAUCET / HITL EVALUATION LOGIC ---
            requires_approval = False
            if tenant_data["hitl_mode"] == "STRICT":
                requires_approval = True
            elif tenant_data["hitl_mode"] == "SAFEGUARDS_ONLY" and response.tool_calls:
                # Trigger interrupt if the AI tries to use a high-risk tool
                if any(tool["name"] == "apply_discount" for tool in response.tool_calls):
                    requires_approval = True
            
            if requires_approval:
                human_decision = interrupt({
                    "type": "APPROVAL_REQUIRED",
                    "proposed_reply": response.content or str(response.tool_calls)
                })
                # If human edited the message before approving, replace it entirely
                if human_decision.get("edited_reply"):
                    return {"messages": [AIMessage(content=human_decision["edited_reply"])]}
            
            return {"messages": response}

        builder = StateGraph(MessagesState)
        builder.add_node("agent", call_model)
        builder.add_edge(START, "agent")
        builder.add_edge("agent", END)

        async with AsyncPostgresSaver.from_conn_string(DB_URI) as checkpointer:
            await checkpointer.setup()
            graph = builder.compile(checkpointer=checkpointer)
            config = {"configurable": {"thread_id": thread_id, "tenant_id": tenant_id}}
            
            # Resume interrupted state or process new message
            if resume_data:
                result = await graph.ainvoke(Command(resume=resume_data), config)
            else:
                result = await graph.ainvoke({"messages": [HumanMessage(content=message)]}, config)
            
            # Check if graph paused waiting for human approval
            snapshot = await graph.aget_state(config)
            if snapshot.next:
                return {"status": "PENDING_APPROVAL", "data": snapshot.tasks[0].interrupts[0].value}
            
            return {"status": "COMPLETED", "reply": result["messages"][-1].content}