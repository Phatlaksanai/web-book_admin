fetch("/components/navbar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("navbar").innerHTML = html;

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }
    
    // ✅ Re-apply settings (Theme, Font, Music) after navbar is loaded
    if (typeof applySettings === 'function') {
      applySettings();
    }
  });

async function logout(e) {
  e.preventDefault();
  console.log("logout clicked");

  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  });

  window.location.href = "/login.html";
}
fetch("/components/footer.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("footer").innerHTML = html;
  });
