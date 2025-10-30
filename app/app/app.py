import reflex as rx
from app.pages import *
from app.backend import fastapi_app

app = rx.App(api_transformer=fastapi_app)
