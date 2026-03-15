from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from db import get_session
from models import User, Message, ChatRequest
from typing import Dict, Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import bcrypt
from bson import ObjectId
import os
from supabase import create_client, Client

IST = timezone(timedelta(hours=5, minutes=30))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: Dict[str, WebSocket] = {}

# ── Supabase client ──
supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"],
)

BUCKET_ATTACHMENTS = "chat-attachments"
BUCKET_VOICE       = "chat-voice"


def hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_value(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ────────────────────────────────────────────
# Upload endpoint
# ────────────────────────────────────────────
@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    kind: str = Form(...),
    from_user: str = Form(...),
):
    contents = await file.read()
    size = len(contents)
    bucket = BUCKET_VOICE if kind == "voice" else BUCKET_ATTACHMENTS
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    ts  = datetime.now(IST).strftime("%Y%m%d%H%M%S%f")
    path = f"{from_user}/{ts}.{ext}"

    supabase.storage.from_(bucket).upload(
        path,
        contents,
        {"content-type": file.content_type, "x-upsert": "true"},
    )
    public_url = supabase.storage.from_(bucket).get_public_url(path)

    return {
        "url": public_url,
        "name": file.filename,
        "mime_type": file.content_type,
        "size": size,
        "kind": kind,
    }


# ────────────────────────────────────────────
# WebSocket
# ────────────────────────────────────────────
@app.websocket("/wss/{username}")
async def chat_ws(websocket: WebSocket, username: str):
    await websocket.accept()
    active_connections[username] = websocket
    print(f"✅ WS connected: {username}")

    # Deliver undelivered messages
    for db in get_session():
        undelivered = list(db["messages"].find({"to_user": username, "delivered": False}))
        for msg in undelivered:
            oid = msg["_id"]
            msg["_id"] = str(oid)
            await websocket.send_json(msg)
            db["messages"].update_one({"_id": oid}, {"$set": {"delivered": True}})

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            # ── Edit ──
            if msg_type == "edit":
                msg_id   = data.get("_id")
                new_text = data.get("text")
                to_user  = data.get("to")
                if not msg_id or not new_text:
                    continue
                for db in get_session():
                    db["messages"].update_one(
                        {"_id": ObjectId(msg_id), "from_user": username},
                        {"$set": {"text": new_text, "edited": True,
                                  "edited_at": datetime.now(IST).isoformat()}}
                    )
                broadcast = {"type": "edit", "_id": msg_id, "text": new_text}
                # Notify recipient
                if to_user and to_user in active_connections:
                    await active_connections[to_user].send_json(broadcast)
                # Echo back to sender so their UI updates too
                if username in active_connections:
                    await active_connections[username].send_json(broadcast)
                continue

            # ── Delete (for everyone) ──
            if msg_type == "delete":
                msg_id  = data.get("_id")
                to_user = data.get("to")
                if not msg_id:
                    continue
                for db in get_session():
                    db["messages"].update_one(
                        {"_id": ObjectId(msg_id)},
                        {"$set": {"deleted_for": ["everyone"]}}
                    )
                broadcast = {"type": "delete", "_id": msg_id}
                # Notify recipient so their bubble updates too
                if to_user and to_user in active_connections:
                    await active_connections[to_user].send_json(broadcast)
                # Echo to sender
                if username in active_connections:
                    await active_connections[username].send_json(broadcast)
                continue

            # ── Regular / attachment / voice message ──
            to_user    = data.get("to")
            text       = data.get("text", "")
            reply_to   = data.get("reply_to")
            attachment = data.get("attachment")

            if not to_user or (not text.strip() and not attachment):
                print("⚠️ Invalid WS payload, skipping")
                continue

            message = {
                "from_user":  username,
                "to_user":    to_user,
                "text":       text,
                "timestamp":  datetime.now(IST).isoformat(),
                "delivered":  False,
                "reply_to":   reply_to or None,
                "attachment": attachment or None,
                "edited":     False,
                "deleted_for": [],
            }

            for db in get_session():
                res = db["messages"].insert_one(message)
                message["_id"] = str(res.inserted_id)

            # Deliver to recipient if online
            if to_user in active_connections:
                await active_connections[to_user].send_json(message)
                message["delivered"] = True
                for db in get_session():
                    db["messages"].update_one(
                        {"_id": res.inserted_id}, {"$set": {"delivered": True}}
                    )

            # Echo back to sender
            if username in active_connections:
                await active_connections[username].send_json(message)

    except WebSocketDisconnect:
        print(f"⚠️ WS disconnected: {username}")
        active_connections.pop(username, None)


# ────────────────────────────────────────────
# REST endpoints
# ────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ChatApp API is running"}


@app.get("/history/{user1}/{user2}")
def get_history(user1: str, user2: str):
    for db in get_session():
        messages = list(db["messages"].find({
            "$or": [
                {"from_user": user1, "to_user": user2},
                {"from_user": user2, "to_user": user1}
            ]
        }).sort("timestamp"))
        for msg in messages:
            msg["_id"] = str(msg["_id"])
        return messages


class ChatRequestBody(BaseModel):
    from_user: str
    to_user: str


@app.post("/request-chat")
def request_chat(data: ChatRequestBody):
    req = data.model_dump()
    req["status"] = "pending"
    for db in get_session():
        db["chatrequests"].insert_one(req)
    return {"msg": "Request sent"}


@app.get("/pending-requests/{username}")
def get_requests(username: str):
    for db in get_session():
        return list(db["chatrequests"].find(
            {"to_user": username, "status": "pending"}, {"_id": 0}
        ))


class AcceptRequestBody(BaseModel):
    from_user: str
    to_user: str


@app.post("/accept-chat")
def accept_chat(data: AcceptRequestBody):
    for db in get_session():
        result = db["chatrequests"].update_one(
            {"from_user": data.from_user, "to_user": data.to_user, "status": "pending"},
            {"$set": {"status": "accepted"}}
        )
        if result.modified_count:
            return {"msg": "Chat accepted"}
        return {"error": "No such request"}


class UpdateStatusBody(BaseModel):
    from_user: str
    to_user: str
    new_status: str


@app.post("/update-status")
def update_status(data: UpdateStatusBody):
    for db in get_session():
        result = db["chatrequests"].update_one(
            {"$or": [
                {"from_user": data.from_user, "to_user": data.to_user},
                {"from_user": data.to_user, "to_user": data.from_user}
            ]},
            {"$set": {"status": data.new_status}}
        )
        if result.modified_count:
            return {"msg": f"Status updated to '{data.new_status}'"}
        raise HTTPException(status_code=404, detail="No existing chat relationship")


@app.get("/users")
def get_users():
    for db in get_session():
        return list(db["users"].find({}, {"_id": 0}))


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/login")
def login(data: LoginRequest):
    for db in get_session():
        user = db["users"].find_one({"username": data.username})
        if not user or not verify_value(data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {"message": "Login successful", "username": user["username"]}


class SignupRequest(BaseModel):
    username: str
    password: str
    question: str
    answer: str


@app.post("/signup")
def signup(data: SignupRequest):
    for db in get_session():
        if db["users"].find_one({"username": data.username}):
            raise HTTPException(status_code=400, detail="Username already exists")
        db["users"].insert_one({
            "username": data.username,
            "password": hash(data.password),
            "security_question": data.question,
            "security_answer": hash(data.answer)
        })
        return {"msg": "User created successfully"}


class Recovery(BaseModel):
    username: str
    answer: str
    new_password: str


@app.get("/recovery-question/{username}")
def get_security_question(username: str):
    for db in get_session():
        user = db["users"].find_one({"username": username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"question": user["security_question"]}


@app.post("/reset-password")
def reset_password(data: Recovery):
    for db in get_session():
        user = db["users"].find_one({"username": data.username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_value(data.answer, user["security_answer"]):
            raise HTTPException(status_code=401, detail="Incorrect answer")
        if data.new_password == "TEMP":
            return {"msg": "Answer verified"}
        db["users"].update_one(
            {"username": data.username},
            {"$set": {"password": hash(data.new_password)}}
        )
        return {"msg": "Password reset successful"}


class RejectRequestBody(BaseModel):
    from_user: str
    to_user: str


@app.post("/reject-chat")
def reject_chat(data: RejectRequestBody):
    for db in get_session():
        result = db["chatrequests"].delete_one({
            "from_user": data.from_user,
            "to_user": data.to_user,
            "status": "pending"
        })
        if result.deleted_count:
            return {"msg": "Request rejected and removed"}
        raise HTTPException(status_code=404, detail="Request not found")


@app.get("/allowed-users/{username}")
def get_allowed_users(username: str):
    for db in get_session():
        requests = db["chatrequests"].find({
            "$or": [{"from_user": username}, {"to_user": username}]
        })
        results = []
        for r in requests:
            other = r["to_user"] if r["from_user"] == username else r["from_user"]
            results.append({"user": other, "status": r["status"]})
        return results


@app.get("/encrypted-history/{user1}/{user2}")
def get_encrypted_history(user1: str, user2: str):
    for db in get_session():
        messages = list(db["messages"].find({
            "$or": [
                {"from_user": user1, "to_user": user2},
                {"from_user": user2, "to_user": user1}
            ]
        }).sort("timestamp"))
        result = []
        for msg in messages:
            msg["_id"] = str(msg["_id"])
            result.append({
                "_id": msg["_id"],
                "from_user": msg["from_user"],
                "to_user": msg["to_user"],
                "text": bcrypt.hashpw(msg["text"].encode(), bcrypt.gensalt()).decode(),
                "timestamp": msg["timestamp"]
            })
        return result