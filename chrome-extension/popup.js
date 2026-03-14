function renderMessage(html) {
  document.getElementById("scoreCard").innerHTML = html
}

function loadScore(email) {
  renderMessage("<p>Loading score for " + email + "...</p>")

  fetch("http://127.0.0.1:8000/analytics/employee-score?email=" + encodeURIComponent(email))
    .then((response) => response.json())
    .then((data) => {
      if (data.detail === "User not found") {
        renderMessage(`
<h3>No Risk Data Yet</h3>
<p>User has not participated in any simulations.</p>
`)
        return
      }

      renderMessage(`
<h3>Score: ${data.score}</h3>
<p>Risk Level: ${data.risk_level}</p>
<p>Clicks: ${data.clicks}</p>
<p>Credentials: ${data.credentials}</p>
<p>Downloads: ${data.downloads}</p>
`)
    })
    .catch((error) => {
      renderMessage("<p>Unable to fetch score</p>")
      console.error(error)
    })
}

// Try to use the email associated with the logged-in Breach user,
// which the content script syncs into chrome.storage when you open the webapp.
chrome.storage.sync.get(["userEmail"], (result) => {
  let email = result.userEmail

  if (!email) {
    renderMessage(`
<h3>No Linked User</h3>
<p>Open the Breach webapp, log in as an employee, then reload this popup.</p>
`)
    return
  }

  loadScore(email)
})

