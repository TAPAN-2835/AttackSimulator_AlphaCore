const API = "https://attacksimulator-alphacore.onrender.com"

// ── Helpers ──────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id) }

function showView(view) {
  $("loginView").classList.toggle("hidden", view !== "login")
  $("dashView").classList.toggle("hidden", view !== "dash")
}

function setLoginError(msg) {
  const el = $("loginError")
  if (msg) {
    el.textContent = msg
    el.classList.remove("hidden")
  } else {
    el.classList.add("hidden")
  }
}

function getRiskClass(level) {
  const map = { LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical" }
  return map[level] || ""
}

// ── Risk Score Display ────────────────────────────────────────────────────────

function renderDash(user, score) {
  // Top bar
  $("userAvatar").textContent = (user.name || user.email)[0].toUpperCase()
  $("userName").textContent = user.name || user.email

  // Score card
  const level = (score.risk_level || "UNKNOWN").toUpperCase()
  $("scoreValue").textContent = score.score ?? "--"
  const circle = $("scoreCircle")
  circle.className = "score-circle " + getRiskClass(level)
  const badge = $("riskBadge")
  badge.textContent = level
  badge.className = "risk-badge " + level

  // Stats
  $("statClicks").textContent = score.clicks ?? 0
  $("statCreds").textContent = score.credentials ?? 0
  $("statDownloads").textContent = score.downloads ?? 0
  $("statReported").textContent = score.reported ?? 0

  showView("dash")
}

// ── Load score from backend ───────────────────────────────────────────────────

async function loadDashboard(token) {
  try {
    // Get current user profile
    const meRes = await fetch(`${API}/auth/me`, {
      headers: { Authorization: "Bearer " + token }
    })
    if (!meRes.ok) throw new Error("token_expired")
    const user = await meRes.json()

    // Get risk score
    const scoreRes = await fetch(`${API}/analytics/employee-score?email=${encodeURIComponent(user.email)}`, {
      headers: { Authorization: "Bearer " + token }
    })
    const score = scoreRes.ok ? await scoreRes.json() : { score: 0, risk_level: "LOW", clicks: 0, credentials: 0, downloads: 0, reported: 0 }

    renderDash(user, score)
  } catch (err) {
    if (err.message === "token_expired") {
      // Token invalid — back to login
      chrome.storage.local.remove(["breach_token"])
      showView("login")
    } else {
      console.error("Breach extension error:", err)
    }
  }
}

// ── Login Flow ────────────────────────────────────────────────────────────────

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault()
  const email = $("email").value.trim()
  const password = $("password").value

  const btn = $("loginBtn")
  btn.disabled = true
  btn.textContent = "Signing in..."
  setLoginError(null)

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || "Invalid email or password")
    }

    const data = await res.json()
    const token = data.access_token

    // Persist token
    chrome.storage.local.set({ breach_token: token }, () => {
      loadDashboard(token)
    })
  } catch (err) {
    setLoginError(err.message || "Login failed")
  } finally {
    btn.disabled = false
    btn.textContent = "Sign In"
  }
})

// ── Logout ────────────────────────────────────────────────────────────────────

$("logoutBtn").addEventListener("click", () => {
  chrome.storage.local.remove(["breach_token"], () => {
    $("email").value = ""
    $("password").value = ""
    setLoginError(null)
    showView("login")
  })
})

// ── Init: check for saved token ───────────────────────────────────────────────

chrome.storage.local.get(["breach_token"], (result) => {
  if (result.breach_token) {
    showView("dash")
    loadDashboard(result.breach_token)
  } else {
    showView("login")
  }
})
