# fastapi/app/main.py
from fastapi import FastAPI

app = FastAPI(title="Wardrobe AI Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"service": "Wardrobe AI Service", "version": "1.0.0"}
