async function loadBooks() {
  const res = await fetch("/api/books");
  const books = await res.json();

  const container = document.getElementById("book-list");
  container.innerHTML = "";

  books.forEach((book) => {
    const div = document.createElement("div");
    div.className = "book-card";
    div.id = `book-${book._id}`;

    div.innerHTML = `
      <img src="${book.coverImage?.url || "/images/default-cover.png"}" 
           alt="${book.title}" 
           style="height:200px;object-fit:cover">

      <p class="mt-2 fw-bold">${book.title}</p>

      <p class="text-muted small mb-2"
         style="
           display:-webkit-box;
           -webkit-line-clamp:2;
           -webkit-box-orient:vertical;
           overflow:hidden;
         ">
        ${book.detail || "-"}
      </p>

      <div class="d-flex gap-2 justify-content-center">
        <button class="btn btn-warning btn-sm" onclick="editBook('${book._id}')">
          Edit
        </button>

        <button class="btn btn-danger btn-sm" onclick="deleteBook('${book._id}')">
          Delete
        </button>
      </div>
    `;

    container.appendChild(div);
  });
}

function editBook(id) {
  window.location.href = "/addbook.html?id=" + id;
}

async function deleteBook(id) {
  if (!confirm("ลบหนังสือเล่มนี้?")) return;

  await fetch("/api/books/" + id, { method: "DELETE" });

  document.getElementById(`book-${id}`)?.remove();
}

loadBooks();
