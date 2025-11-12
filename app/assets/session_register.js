(function() {
  // Expose registration function so it can be explicitly triggered
  // from the Reflex on_load flow (via a conditional inline script).
  window.registerReflexSession = async function registerReflexSession() {
    if (window.__reflex_session_registered) {
      return;
    }

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
        // Token might not be available yet; retry shortly
        setTimeout(() => {
          window.registerReflexSession();
        }, 500);
        return;
      }

      const payload = { token };
      const BACKEND_URL = window.__BACKEND_URL || "http://localhost:8000";

      const res = await fetch(`${BACKEND_URL}/sessions/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error("❌ Session register network error:", err);
        return null;
      });

      if (!res) return;

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("❌ Failed to register session:", text);
        // Retry on server error after a delay
        setTimeout(() => {
          window.registerReflexSession();
        }, 1000);
        return;
      }

      console.log("✅ Session registered successfully!");
      window.__reflex_session_registered = true;

      // Keep the session alive with periodic pings
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

      // Unregister on unload
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
        } catch (e) {
          // ignore
        }
      });

    } catch (err) {
      console.error("💥 Session registration error:", err);
      // Retry on unexpected error
      setTimeout(() => {
        window.registerReflexSession();
      }, 1000);
    }
  };

  // Auto-attempt registration after DOM ready (small delay to allow Reflex)
  function autoTry() {
    if (!window.__reflex_session_registered) {
      window.registerReflexSession();
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(autoTry, 300);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoTry, 300));
  }
})();
