from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
import os
import glob
import time
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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


def load_legal_data():
    combined_text = ""
    loaded_files = []
    for filepath in sorted(glob.glob(os.path.join(DATA_DIR, "*.txt"))):
        with open(filepath, "r", encoding="utf-8") as f:
            combined_text += f.read() + "\n\n---\n\n"
            loaded_files.append(os.path.basename(filepath))
    print(f"Loaded {len(loaded_files)} legal data files: {loaded_files}")
    return combined_text


legal_context = load_legal_data()


class Question(BaseModel):
    question: str


@app.get("/")
def health_check():
    return {"status": "ok", "data_files_loaded": bool(legal_context)}


@app.post("/chat")
def chat(q: Question):
    prompt = f"""You are a Legal Rights Assistant for Indian citizens. You have reference information covering many areas of Indian law: RTI, Consumer Rights, Tenant Rights, Cyber & Women's Safety, Labour & Employment, Family Law, Criminal Law, Property & Housing, Constitutional Rights, Digital Rights, Education Rights, and Healthcare Rights.

Instructions:
- Find the section(s) most relevant to the user's question and answer primarily from those.
- Keep the answer simple, in plain language, for someone with no legal background.
- If the question spans multiple areas, briefly address each relevant area.
- If nothing in the reference material is relevant, answer using your general knowledge of Indian law, but mention that this isn't covered in your specific reference material.
- Always end with a short disclaimer that this is general information, not legal advice.

Reference information:
{legal_context}

User question: {q.question}
"""
    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return {"answer": response.text}
        except Exception as e:
            last_error = e
            print(f"ERROR in /chat (attempt {attempt + 1}/{max_retries}): {type(e).__name__}: {e}")
            if attempt < max_retries - 1:
                time.sleep(2 * (attempt + 1))

    return {"answer": "Sorry, something went wrong generating a response. Please try again in a moment."}