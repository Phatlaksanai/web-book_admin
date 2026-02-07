$(document).ready(function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    alert("ไม่พบรหัสหนังสือ");
    window.location.href = "/library.html";
    return;
  }

  loadBook(id);
});

async function loadBook(id) {
  try {
    // ดึงข้อมูลหนังสือ
    const res = await fetch(`/api/books/${id}`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to load book");

    const book = await res.json();

    if (!book.pages || book.pages.length === 0) {
      alert("หนังสือเล่มนี้ยังไม่พร้อมใช้งาน หรือไม่มีหน้าหนังสือ");
      window.location.href = "/library.html";
      return;
    }

    // เรียงลำดับหน้า (เผื่อไว้)
    book.pages.sort((a, b) => a.pageNumber - b.pageNumber);

    const flipbook = $("#flipbook");
    $("#page-total").text(book.pages.length);

    // สร้าง Element หน้าหนังสือ
    book.pages.forEach((page) => {
      const div = $("<div />")
        .addClass("page")
        .css({
          "background-image": `url(${page.imageUrl})`,
        });
      flipbook.append(div);
    });

    // เริ่มต้น Turn.js
    flipbook.turn({
      width: 900,
      height: 600,
      autoCenter: true,
      display: "double", // แสดงคู่หน้า
      acceleration: true,
      gradients: true,
      elevation: 50,
      when: {
        turned: function (e, page) {
          $("#page-current").text(page);
        },
      },
    });

    // รองรับการกดปุ่มลูกศรซ้าย/ขวา
    $(document).keydown(function (e) {
      if (e.keyCode == 37) flipbook.turn("previous");
      if (e.keyCode == 39) flipbook.turn("next");
    });

    // ปรับขนาดเมื่อย่อ/ขยายจอ
    $(window).resize(resizeFlipbook);
    resizeFlipbook(); // เรียกครั้งแรก

  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาดในการโหลดหนังสือ");
  }
}

function prevPage() {
  $("#flipbook").turn("previous");
}

function nextPage() {
  $("#flipbook").turn("next");
}

function resizeFlipbook() {
  const width = $(window).width();
  const height = $(window).height();
  
  // ปรับขนาดให้พอดีจอ (Responsive)
  let newWidth = width > 1000 ? 900 : width - 40;
  let newHeight = (newWidth * 600) / 900; // รักษาสัดส่วน

  $("#flipbook").turn("size", newWidth, newHeight);
}