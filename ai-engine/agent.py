import os
import psycopg
from psycopg.rows import dict_row
from typing import Annotated, Sequence
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage, SystemMessage, trim_messages
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.postgres import PostgresSaver

DB_URI = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/portfolio")

# 1. State Definition
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    tenant_id: str

# 2. Fetch Tenant Config from Postgres
def get_tenant_config(tenant_id: str) -> dict:
    query = "SELECT system_prompt, default_model, temperature FROM tenants_config WHERE tenant_id = %s"
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, (tenant_id,))
            row = cur.fetchone()
            if row:
                return row
    # Default fallback
    return {
        "system_prompt": "You are a helpful assistant.",
        "default_model": "gpt-4o-mini",
        "temperature": 0.2
    }

# 3. Dynamic Agent Node with Message Trimming
def make_agent_node(tools):
    def agent_node(state: AgentState):
        tenant_id = state.get("tenant_id", "clerk_a")
        cfg = get_tenant_config(tenant_id)

        # Message Trimmer: Keep system prompt + last 8 messages (prevent context explosion)
        trimmed = trim_messages(
            state["messages"],
            max_tokens=2000,
            token_counter=len, # Character/word count approximation for speed
            strategy="last",
            start_on="human",
            include_system=False
        )

        llm = ChatOpenAI(
            model=cfg["default_model"],
            temperature=cfg["temperature"],
            api_key=os.getenv("OPENAI_API_KEY")
        ).bind_tools(tools)

        sys_msg = SystemMessage(content=cfg["system_prompt"])
        response = llm.invoke([sys_msg] + trimmed)
        return {"messages": [response]}

    return agent_node

# 4. Graph Builder
def create_graph(tools, checkpointer: PostgresSaver):
    builder = StateGraph(AgentState)
    builder.add_node("agent", make_agent_node(tools))
    builder.add_node("tools", ToolNode(tools))

    builder.add_edge(START, "agent")
    builder.add_conditional_edges("agent", tools_condition)
    builder.add_edge("tools", "agent")

    return builder.compile(checkpointer=checkpointer)