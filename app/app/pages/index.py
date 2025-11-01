import reflex as rx
from app.components import sidebar
from app.states import IndexState

# Identificador del dispositivo (puede hacerse dinámico)
DEVICE_ID = "pc1"

# URL completa del backend FastAPI
BACKEND_URL = "http://localhost:8000"  # cambia si tu backend está en otro host o puerto

@rx.page("/")
def dashboard() -> rx.Component:
    js = f"""
    (async function() {{
      try {{
        // === Obtener el token Reflex ===
        let token = null;
        try {{
          if (typeof getToken === "function") {{
            token = getToken();
          }}
        }} catch (e) {{
          token = null;
        }}

        if (!token) {{
          token = sessionStorage.getItem("token") ||
                   sessionStorage.getItem("session.token") ||
                   localStorage.getItem("token") ||
                   null;
        }}

        if (!token) {{
          console.warn("⚠️ Reflex token not found. Session registration skipped.");
          return;
        }}

        const payload = {{
          device_id: "{DEVICE_ID}",
          token: token
        }};

        console.log("🔐 Registering session for device:", payload);

        // === Registrar sesión ===
        const res = await fetch("{BACKEND_URL}/sessions/register", {{
          method: "POST",
          headers: {{ "Content-Type": "application/json" }},
          body: JSON.stringify(payload),
        }});

        if (!res.ok) {{
          console.error("❌ Failed to register session:", await res.text());
          return;
        }}

        console.log("✅ Session registered successfully!");

        // === Mantener viva la sesión cada 60s ===
        setInterval(() => {{
          fetch("{BACKEND_URL}/sessions/ping", {{
            method: "POST",
            headers: {{ "Content-Type": "application/json" }},
            body: JSON.stringify(payload)
          }}).catch((err) => {{
            console.warn("⚠️ Ping failed:", err);
          }});
        }}, 60000);

        // === Desregistrar antes de cerrar la pestaña ===
        window.addEventListener("beforeunload", function() {{
          const data = JSON.stringify(payload);
          if (navigator.sendBeacon) {{
            navigator.sendBeacon("{BACKEND_URL}/sessions/unregister", data);
          }} else {{
            fetch("{BACKEND_URL}/sessions/unregister", {{
              method: "POST",
              headers: {{ "Content-Type": "application/json" }},
              body: data,
              keepalive: true
            }});
          }}
        }});
      }} catch (err) {{
        console.error("💥 Session registration error:", err);
      }}
    }})();
    """

    return rx.box(
        sidebar(),
        rx.box(
            rx.script(js),
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
