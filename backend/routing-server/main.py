from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.transaction_routes import router as transaction_router
from storage import initialise_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(title="Spendwise API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(transaction_router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Spendwise API"}
