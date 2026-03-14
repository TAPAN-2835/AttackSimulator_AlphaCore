console.log("Phishing detector active")

window.addEventListener("load", () => {

const suspiciousDomains = [
"micros0ft",
"paypaI",
"g00gle",
"faceb00k"
]

const suspiciousKeywords = [
"login",
"secure",
"verify",
"update",
"account",
"bank",
"password"
]

const hostname = window.location.hostname.toLowerCase()

let suspicious = true

// domain spoofing check
suspiciousDomains.forEach(domain => {
 if(hostname.includes(domain)){
  suspicious = true
 }
})

// keyword check
suspiciousKeywords.forEach(word => {
 if(hostname.includes(word)){
  suspicious = true
 }
})


// password field detection
const passwordField = document.querySelector('input[type="password"]')

if(passwordField && suspicious){

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