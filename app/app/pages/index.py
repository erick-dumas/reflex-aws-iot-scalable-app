import reflex as rx
from app.components import sidebar
from app.states import IndexState

BACKEND_URL = "http://localhost:8000"

@rx.page("/", on_load=IndexState.index_on_load_event)
def dashboard() -> rx.Component:
    return rx.box(
        sidebar(),
        rx.box(
            rx.script("window.__BACKEND_URL = '{}';".format(BACKEND_URL)),
            rx.script(src="/session_register.js"),
            # When IndexState.page_loaded becomes True (set by the on_load event),
            # render an inline script that triggers the registration function
            # exposed by `session_register.js`. This ensures the function is
            # called after the page load event and after the external script
            # has been requested.
            rx.cond(
                IndexState.page_loaded,
                rx.script(
                    "(function(){"
                    "  function trigger() {"
                    "    if (typeof window.registerReflexSession === 'function') {"
                    "      window.registerReflexSession();"
                    "    } else {"
                    "      setTimeout(trigger, 100);"
                    "    }"
                    "  }"
                    "  setTimeout(trigger, 200);"
                    "})();"
                ),
            ),
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
