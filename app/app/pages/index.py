import reflex as rx
from app.components import sidebar
from app.states import IndexState

BACKEND_URL = "http://localhost:8000"

@rx.page("/")
def dashboard() -> rx.Component:
    return rx.box(
        sidebar(),
        rx.box(
            rx.script("window.__BACKEND_URL = '{}';".format(BACKEND_URL)),
            rx.script(src="/session_register.js"),
            rx.text("Main Dashboard Content"),
            rx.hstack(
                rx.text("Last Temperature:"),
                rx.text(IndexState.last_temperature),
                rx.text("°C"),
                align="center",
            ),
            margin_left="25em",
            padding="2em",
        ),
    )
