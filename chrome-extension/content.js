const BREACH_API = "https://attacksimulator-alphacore.onrender.com"

// ── Helper: extract a simulation token from the URL ──────────────────────────
// Backend sim URLs follow: GET /sim/{token}
// e.g. https://attacksimulator-alphacore.onrender.com/sim/abc-123
function extractSimToken() {
  const hostname = window.location.hostname
  const pathname = window.location.pathname

  const isBreachHost =
    hostname.includes("onrender.com") ||
    hostname.includes("vercel.app") ||
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1")

  // Direct path-based sim URL: /sim/<token>
  const simMatch = pathname.match(/^\/sim\/([a-zA-Z0-9_-]{6,})/)
  if (simMatch) return simMatch[1]

  // Query param: ?token=<token>
  const params = new URLSearchParams(window.location.search)
  if (params.get("token")) return params.get("token")

  return null
}

// ── Helper: ask the backend if this token is a known simulation ───────────────
async function isAdminSimulation(token) {
  try {
    const res = await fetch(`${BREACH_API}/sim/${token}/check`, {
      method: "GET",
    })
    // If it's a valid sim token the backend will return 200
    return res.ok
  } catch {
    return false
  }
}

// ── Helper: in-app risk score widget on learning portal ───────────────────────
function injectRiskWidget(user, score) {
  try {
    if (document.getElementById("breach-risk-widget")) return

    const container = document.createElement("div")
    container.id = "breach-risk-widget"
    container.innerHTML = `
      <div style="
        display:flex;
        align-items:center;
        gap:10px;
      ">
        <div style="
          width:32px;
          height:32px;
          border-radius:999px;
          background:rgba(148, 163, 184, 0.2);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:600;
          font-size:14px;
        ">
          ${(user.name || user.email || "?")[0].toUpperCase()}
        </div>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:12px; opacity:0.75;">Your Breach risk score</span>
          <span style="font-size:16px; font-weight:700;">
            ${score.score ?? "--"}/100
            <span style="font-size:11px; font-weight:600; margin-left:4px; padding:2px 6px; border-radius:999px; background:rgba(15, 23, 42, 0.8);">
              ${(score.risk_level || "UNKNOWN").toUpperCase()}
            </span>
          </span>
        </div>
      </div>
    `

    Object.assign(container.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483647",
      padding: "10px 14px",
      borderRadius: "999px",
      background: "linear-gradient(135deg, #020617, #0f172a)",
      color: "white",
      boxShadow: "0 18px 45px rgba(15,23,42,0.7)",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      border: "1px solid rgba(148, 163, 184, 0.4)",
    })

    document.body.appendChild(container)
  } catch (err) {
    console.warn("Breach extension: unable to inject risk widget", err)
  }
}

// ── Main phishing detector + app integration ───────────────────────────────────
window.addEventListener("load", async () => {
  const hostname = window.location.hostname.toLowerCase()
  const pathname = window.location.pathname.toLowerCase()
  const search = window.location.search.toLowerCase()

  // ---------- Attach logged-in user from webapp to extension ----------
  try {
    const isBreachApp =
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1") ||
      hostname.includes("onrender.com") ||
      hostname.includes("vercel.app")

    if (isBreachApp && typeof window.localStorage !== "undefined") {
      const token = window.localStorage.getItem("breach_token")
      if (token) {
        // Always sync token into extension so popup can use it,
        // even if CORS blocks auth verification from the webapp origin.
        chrome.storage.local.set({ breach_token: token }, () => {
          console.log("Breach extension synced token from web app")
        })

        // Best-effort: if backend allows CORS from the app origin,
        // enrich with user + risk score inside the learning portal page.
        fetch(`${BREACH_API}/auth/me`, {
          headers: { "Authorization": "Bearer " + token },
        })
          .then((res) => res.ok ? res.json() : null)
          .then(async (user) => {
            if (!user || !user.email) return

            // If user is on the learning portal, also show in-page risk score
            const onLearningPortal = pathname.startsWith("/dashboard/learning-portal")
            if (!onLearningPortal) return

            try {
              const scoreRes = await fetch(
                `${BREACH_API}/analytics/employee-score?email=${encodeURIComponent(user.email)}`,
                {
                  headers: { Authorization: "Bearer " + token },
                }
              )
              if (!scoreRes.ok) return
              const score = await scoreRes.json()
              injectRiskWidget(user, score)
            } catch (e) {
              console.warn("Breach extension: unable to load risk score", e)
            }
          })
          .catch(() => {})
      }
    }
  } catch (err) {
    console.warn("Breach extension: unable to access app token")
  }

  // ---------- Whitelisted domains - admin platform itself ----------
  const whitelistDomains = [
    "localhost",
    "127.0.0.1",
    "onrender.com",
    "vercel.app",
  ]

  for (const domain of whitelistDomains) {
    if (hostname.includes(domain)) return  // It's our own app — never warn
  }

  // ---------- Check if this is an admin-generated simulation link ----------
  // Try to detect a simulation token in the URL
  const simToken = extractSimToken()
  if (simToken) {
    const isSim = await isAdminSimulation(simToken)
    if (isSim) {
      console.log("Breach: Admin simulation detected — bypassing phishing warning")
      return  // This is an intentional training simulation — no warning
    }
  }

  // ---------- Suspicious pattern detection ----------
  const suspiciousDomains = [
    "micros0ft", "paypaI", "g00gle", "faceb00k",
    "arnazon", "app1e", "nett1ix", "linkedln",
  ]

  const suspiciousKeywords = [
    "login", "secure", "verify", "update",
    "account", "bank", "password", "signin",
    "confirm", "credentials", "validate",
  ]

  let suspicious = false

  // Domain spoof (typosquatting)
  for (const spoof of suspiciousDomains) {
    if (hostname.includes(spoof)) { suspicious = true; break }
  }

  // Keyword in hostname (e.g. secure-login-paypal.xyz)
  if (!suspicious) {
    for (const word of suspiciousKeywords) {
      if (hostname.includes(word)) { suspicious = true; break }
    }
  }

  // IP address as hostname (common in phishing)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) suspicious = true

  // Non-https on a page that asks for a password
  const isHttp = window.location.protocol === "http:"
  const passwordField = document.querySelector('input[type="password"]')

  if (!suspicious && isHttp && passwordField) suspicious = true

  // ---------- Show warning banner ----------
  if (passwordField && suspicious) {
    const banner = document.createElement("div")
    banner.id = "breach-warning"

    banner.innerHTML = `
      <span style="font-size:20px; margin-right:10px;">⚠️</span>
      <div>
        <strong style="display:block; font-size:14px; margin-bottom:2px;">Potential Phishing Site Detected</strong>
        <span style="font-size:12px; opacity:0.9;">This page may be trying to steal your credentials. Verify the URL before entering any information.</span>
      </div>
      <button id="breach-dismiss" style="
        margin-left:auto; background:rgba(255,255,255,0.15); border:none; color:white;
        border-radius:6px; padding:4px 10px; cursor:pointer; font-size:13px; flex-shrink:0;
      ">Dismiss</button>
    `

    Object.assign(banner.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      background: "linear-gradient(90deg, #b91c1c, #dc2626)",
      color: "white",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      zIndex: "2147483647",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    })

    document.body.style.marginTop = "66px"
    document.body.prepend(banner)

    document.getElementById("breach-dismiss").addEventListener("click", () => {
      banner.remove()
      document.body.style.marginTop = ""
    })
  }
})
