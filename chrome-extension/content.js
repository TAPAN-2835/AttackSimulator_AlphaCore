console.log("Phishing detector active")

window.addEventListener("load", () => {
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
        fetch("http://127.0.0.1:8000/auth/me", {
          headers: {
            "Authorization": "Bearer " + token,
          },
        })
          .then((res) => res.ok ? res.json() : null)
          .then((user) => {
            if (user && user.email) {
              chrome.storage.sync.set({ userEmail: user.email }, () => {
                console.log("Breach extension attached to user:", user.email)
              })
            }
          })
          .catch((err) => {
            console.warn("Breach extension: failed to sync user", err)
          })
      }
    }
  } catch (err) {
    console.warn("Breach extension: unable to access app token", err)
  }

  // ---------- Phishing detector ----------

  /* ---------- Whitelisted domains (admin simulations) ---------- */

  const whitelistDomains = [
    "localhost",
    "127.0.0.1",
    "training.company.com",
    "phishing-simulator.com",
  ]

  let whitelisted = false

  // 1) Explicit domain whitelist
  whitelistDomains.forEach((domain) => {
    if (hostname.includes(domain)) {
      whitelisted = true
    }
  })

  // 2) Breach simulation & training URLs should never warn
  const isBreachSimOrTraining =
    pathname.startsWith("/sim/") ||
    pathname === "/sim" ||
    pathname.startsWith("/phish/") ||
    pathname.includes("/training") ||
    search.includes("campaign_id=") && pathname.includes("/sim")

  if (whitelisted || isBreachSimOrTraining) {
    console.log("Trusted simulation/training context detected")
    return
  }

  /* ---------- Suspicious patterns ---------- */

  const suspiciousDomains = [
    "micros0ft",
    "paypaI",
    "g00gle",
    "faceb00k",
  ]

  const suspiciousKeywords = [
    "login",
    "secure",
    "verify",
    "update",
    "account",
    "bank",
    "password",
    "signin",
  ]

  let suspicious = false

  /* domain spoof detection */

  suspiciousDomains.forEach((domain) => {
    if (hostname.includes(domain)) {
      suspicious = true
    }
  })

  /* keyword detection */

  suspiciousKeywords.forEach((word) => {
    if (hostname.includes(word)) {
      suspicious = true
    }
  })

  /* password field detection */

  const passwordField = document.querySelector('input[type="password"]')

  /* ---------- Show warning ---------- */

  if (passwordField && suspicious) {
    const banner = document.createElement("div")

    banner.innerText =
      "⚠ Potential Phishing Website Detected. Verify the URL before entering credentials."

    banner.style.position = "fixed"
    banner.style.top = "0"
    banner.style.left = "0"
    banner.style.width = "100%"
    banner.style.background = "#dc2626"
    banner.style.color = "white"
    banner.style.padding = "12px"
    banner.style.fontSize = "16px"
    banner.style.textAlign = "center"
    banner.style.zIndex = "999999"

    document.body.prepend(banner)
  }
})
