# models.py
from typing import Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

def ist_now():
    return datetime.now(IST)

class User(BaseModel):
    username: str
    password: str
    security_question: str
    security_answer: str

class ReplyTo(BaseModel):
    message_id: str
    from_user: str
    text: str

class Attachment(BaseModel):
    url: str
    name: str
    mime_type: str   # e.g. "image/jpeg", "application/pdf", "audio/webm"
    size: int        # bytes
    kind: Literal["image", "document", "voice"]

class Message(BaseModel):
    from_user: str
    to_user: str
    text: str = ""
    delivered: bool = False
    timestamp: datetime = Field(default_factory=ist_now)
    reply_to: Optional[ReplyTo] = None
    attachment: Optional[Attachment] = None
    edited: bool = False
    deleted_for: list = Field(default_factory=list)

class ChatRequest(BaseModel):
    from_user: str
    to_user: str
    status: str = "pending"