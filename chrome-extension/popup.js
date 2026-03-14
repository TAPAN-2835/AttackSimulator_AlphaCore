function loadScore(email) {

fetch("http://127.0.0.1:8000/analytics/employee-score?email=" + email)
.then(response => response.json())
.then(data => {

if(data.detail === "User not found"){

document.getElementById("scoreCard").innerHTML = `
<h3>No Risk Data Yet</h3>
<p>User has not participated in any simulations.</p>
`

return
}

document.getElementById("scoreCard").innerHTML = `
<h3>Score: ${data.score}</h3>
<p>Risk Level: ${data.risk_level}</p>
<p>Clicks: ${data.clicks}</p>
<p>Credentials: ${data.credentials}</p>
<p>Downloads: ${data.downloads}</p>
`

})
.catch(error => {

document.getElementById("scoreCard").innerHTML =
"<p>Unable to fetch score</p>"

console.error(error)

})

}

chrome.identity.getProfileUserInfo(function(userInfo){

let email = userInfo.email

if(!email){
email = "demo@company.com"
}

loadScore(email)

})