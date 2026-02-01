async function loadBooks() {
  const res = await fetch("/api/books");
  const books = await res.json();

  const container = document.getElementById("book-list");
  container.innerHTML = "";

  if (books.length === 0) {
    container.innerHTML = `<div class="col-12 text-center py-5 text-muted">ไม่พบหนังสือในระบบ</div>`;
    return;
  }

  books.forEach((book) => {
    const col = document.createElement("div");
    col.className = "col-sm-6 col-md-4 col-lg-3";
    col.id = `book-${book._id}`;

    col.innerHTML = `
      <div class="card h-100">
        <div style="height: 250px; overflow: hidden; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
          <img src="${book.coverImage?.url || "/images/default-cover.png"}" 
               alt="${book.title}" 
               class="card-img-top"
               style="width: 100%; height: 100%; object-fit: cover;">
        </div>

        <div class="card-body d-flex flex-column">
          <h6 class="card-title fw-bold text-truncate" title="${book.title}">${book.title}</h6>
          
          <p class="card-text text-muted small flex-grow-1"
             style="display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
            ${book.detail || "-"}
          </p>

          ${
            book.isOwner
              ? `<div class="d-flex gap-2 mt-3 pt-3 border-top">
                   <button class="btn btn-warning btn-sm flex-fill" onclick="editBook('${book._id}')">
                     Edit
                   </button>
                   <button class="btn btn-danger btn-sm flex-fill" onclick="deleteBook('${book._id}')">
                     Delete
                   </button>
                 </div>`
              : `<div class="mt-3 pt-3 border-top text-center">
                   <span class="badge bg-light text-dark border">Read Only</span>
                 </div>`
          }
        </div>
        <div class="card-footer bg-white text-muted small py-2">
            Added by: ${book.addedBy?.email?.split('@')[0] || 'Unknown'}
        </div>
      </div>
    `;

    container.appendChild(col);
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
