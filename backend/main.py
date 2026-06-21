from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
import os
import glob
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your real frontend URL after deploying
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Always resolve the data folder relative to THIS file, not the current
# working directory. This matters once you deploy — the server might be
# started from a different folder than your local machine.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


def load_legal_data():
    combined_text = ""
    for filepath in glob.glob(os.path.join(DATA_DIR, "*.txt")):
        with open(filepath, "r", encoding="utf-8") as f:
            combined_text += f.read() + "\n\n"
    return combined_text


legal_context = load_legal_data()


class Question(BaseModel):
    question: str


@app.get("/")
def health_check():
    # Lets you (and uptime monitors) confirm the backend is alive.
    return {"status": "ok", "data_files_loaded": bool(legal_context)}


@app.post("/chat")
def chat(q: Question):
    prompt = f"""You are a Legal Rights Assistant for Indian citizens. Answer the user's question using the reference information below whenever it's relevant. Keep the answer simple, in plain language, for someone with no legal background. Always end with a short disclaimer that this is general information, not legal advice.

Reference information:
{legal_context}

User question: {q.question}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return {"answer": response.text}
    except Exception as e:
        # Don't crash with a raw 500 — return something the frontend can show.
        return {"answer": "Sorry, something went wrong generating a response. Please try again in a moment."}