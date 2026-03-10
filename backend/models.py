# models.py
from typing import Optional
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
    text: str  # preview of the original message

class Message(BaseModel):
    from_user: str
    to_user: str
    text: str
    delivered: bool = False
    timestamp: datetime = Field(default_factory=ist_now)
    reply_to: Optional[ReplyTo] = None  # None if not a reply

class ChatRequest(BaseModel):
    from_user: str
    to_user: str
    status: str = "pending"
