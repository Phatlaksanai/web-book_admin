/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");

  const submitBtn = document.getElementById("submitBtn");
  const pageTitle = document.getElementById("pageTitle");

  /* =====================
     EDIT MODE
  ===================== */
  if (editId) {
    submitBtn.innerText = "Update Book";

    if (pageTitle) {
      pageTitle.innerText = "✏️ Edit Book";
    }

    loadBookData(editId);
  }

  /* preview cover */
  document.getElementById("cover")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const preview = document.getElementById("coverPreview");
      preview.src = reader.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  });
});


/* =========================
   SUBMIT
========================= */
function submitBook() {
  const id = new URLSearchParams(location.search).get("id");

  if (id) updateBook(id);
  else createBook();
}


/* =========================
   MESSAGE
========================= */
function showMessage(text, color = "green") {
  const el = document.getElementById("create-message");
  if (!el) return;

  el.style.color = color;
  el.innerText = text;

  setTimeout(() => (el.innerText = ""), 2000);
}


/* =========================
   CREATE
========================= */
async function createBook() {

  const formData = getFormData();

  try {
    const res = await fetch("/api/books", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    if (!res.ok) return showMessage("❌ Error", "red");

    showMessage("✅ Created");
    clearForm();

  } catch {
    showMessage("❌ Error", "red");
  }
}


/* =========================
   UPDATE
========================= */
async function updateBook(id) {

  const formData = getFormData();

  try {
    const res = await fetch("/api/books/" + id, {
      method: "PUT",
      credentials: "include",
      body: formData
    });

    if (!res.ok) return showMessage("❌ Error", "red");

    showMessage("✅ Updated");

    setTimeout(() => {
      location.href = "/library.html";
    }, 800);

  } catch {
    showMessage("❌ Error", "red");
  }
}


/* =========================
   LOAD BOOK (EDIT)
========================= */
async function loadBookData(id) {

  try {
    const res = await fetch("/api/books/" + id, {
      credentials: "include"
    });

    const book = await res.json();

    document.getElementById("title").value = book.title || "";
    document.getElementById("detail").value = book.detail || "";

    if (book.coverImage?.url) {
      const preview = document.getElementById("coverPreview");
      preview.src = book.coverImage.url;
      preview.style.display = "block";
    }

    if (book.pdfFile?.url) {
      document.getElementById("pdfFileName").innerText =
        "Current: " + book.pdfFile.url.split("/").pop();
    }

  } catch (err) {
    console.error(err);
  }
}


/* =========================
   HELPERS
========================= */
function getFormData() {
  const title = document.getElementById("title").value;
  const detail = document.getElementById("detail").value;
  const cover = document.getElementById("cover").files[0];
  const pdf = document.getElementById("pdf").files[0];

  const fd = new FormData();

  fd.append("title", title);
  fd.append("detail", detail);

  if (cover) fd.append("cover", cover);
  if (pdf) fd.append("pdf", pdf);

  return fd;
}


function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("detail").value = "";
  document.getElementById("cover").value = "";
  document.getElementById("pdf").value = "";
}
