"""
Core types for the AI layer (Python)

Mirrors the TypeScript interfaces from packages/ai-core/src/types.ts
"""

from typing import Any, AsyncIterable, Literal, Optional
from pydantic import BaseModel, Field


class Message(BaseModel):
    """A single message in the conversation"""
    role: Literal['user', 'assistant']
    content: str


class Tool(BaseModel):
    """Tool definition for function calling"""
    name: str
    description: str
    input_schema: dict[str, Any]


class ChatParams(BaseModel):
    """Parameters for a chat call"""
    user_id: str
    feature_id: str
    messages: list[Message]
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    tools: Optional[list[Tool]] = None


class UsageInfo(BaseModel):
    """Token usage and cost information"""
    tokens_in: int
    tokens_out: int
    cost_usd: float


class ChatResult(BaseModel):
    """Result from a chat call"""
    content: str
    usage: UsageInfo
    model: str
    latency_ms: float


class PartialTokens(BaseModel):
    """Partial token counts during streaming"""
    tokens_in: int
    tokens_out: int


class ChatChunkDelta(BaseModel):
    """Delta content in a streaming chunk"""
    type: Literal['text_delta', 'start_stream', 'stop_stream']
    text: Optional[str] = None


class ChatChunk(BaseModel):
    """Individual chunk from a streaming chat response"""
    delta: ChatChunkDelta
    partial_tokens: Optional[PartialTokens] = None


class GenerateParams(BaseModel):
    """Parameters for structured output generation"""
    user_id: str
    feature_id: str
    messages: list[Message]
    output_schema: dict[str, Any]  # Renamed from 'schema' to avoid shadowing BaseModel.schema()
    model: Optional[str] = None
    max_tokens: Optional[int] = None


class DateRange(BaseModel):
    """Date range for filtering"""
    start: str
    end: str


class UsageSummary(BaseModel):
    """Usage summary for a period"""
    tokens_in: int
    tokens_out: int
    cost_usd: float
    calls: int
    period: DateRange


class CreditBalance(BaseModel):
    """Credit balance information"""
    remaining_usd: float
    used_usd: float
    period_start: str
    period_end: str
    spending_cap_usd: Optional[float] = None


class ModelInfo(BaseModel):
    """Model information from registry"""
    id: str
    provider: str
    display_name: str
    cost_per_input_token: float
    cost_per_output_token: float
    max_context_tokens: int
    max_output_tokens: int
    supports_streaming: bool
    supports_tools: bool
    is_default: bool
    is_active: bool


class AIClientConfig(BaseModel):
    """Configuration for initializing an AIClient"""
    app_id: str
    supabase_client: Any  # Cannot type SupabaseClient without circular dependency
    default_model: Optional[str] = None
