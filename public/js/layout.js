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

    // ✅ Hide Add Admin menu for non-admins
    const role = localStorage.getItem('role');
    const addAdminBtn = document.querySelector('a[href="/addadmin"]');
    if (addAdminBtn && role !== 'admin') {
      addAdminBtn.style.display = 'none';
    }
  });

async function logout(e) {
  e.preventDefault();
  console.log("logout clicked");

  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  });

  localStorage.removeItem('token'); // ✅ ลบ Token เพื่อไม่ให้เด้งกลับเข้า Dashboard
  window.location.href = "/index.html"; // ✅ กลับไปหน้า Welcome
}
fetch("/components/footer.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("footer").innerHTML = html;
  });
