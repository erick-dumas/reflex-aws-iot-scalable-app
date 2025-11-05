(function() {
  if (window.__reflex_session_registered) return;

  (async function registerSession() {
    try {
      let token = null;
      try {
        if (typeof getToken === "function") {
          token = getToken();
        }
      } catch (e) {
        token = null;
      }

      if (!token) {
        token = sessionStorage.getItem("token") ||
                sessionStorage.getItem("session.token") ||
                localStorage.getItem("token") ||
                null;
      }

      if (!token) {
        console.warn("⚠️ Reflex token not found. Session registration skipped.");
        return;
      }

      const payload = { token };

      const BACKEND_URL = window.__BACKEND_URL;

      const res = await fetch(`${BACKEND_URL}/sessions/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("❌ Failed to register session:", await res.text());
        return;
      }

      console.log("✅ Session registered successfully!");
      window.__reflex_session_registered = true;

      if (!window.__reflex_session_ping_interval) {
        window.__reflex_session_ping_interval = setInterval(() => {
          fetch(`${BACKEND_URL}/sessions/ping`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch((err) => {
            console.warn("⚠️ Session ping failed:", err);
          });
        }, 60000);
      }

      window.addEventListener("beforeunload", function() {
        const data = JSON.stringify(payload);
        try {
          if (navigator.sendBeacon) {
            navigator.sendBeacon(`${BACKEND_URL}/sessions/unregister`, data);
          } else {
            fetch(`${BACKEND_URL}/sessions/unregister`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: data,
              keepalive: true,
            });
          }
        } catch (e) {}
      });

    } catch (err) {
      console.error("💥 Session registration error:", err);
    }
  })();
})();
