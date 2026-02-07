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
          $("#page-input").val(page);
        },
      },
    });

    // รองรับการกดปุ่มลูกศรซ้าย/ขวา
    $(document).keydown(function (e) {
      if (e.keyCode == 37) flipbook.turn("previous");
      if (e.keyCode == 39) flipbook.turn("next");
    });

    // รองรับการพิมพ์เลขหน้าเพื่อข้าม
    $("#page-input").change(function () {
      const page = parseInt($(this).val());
      if (page >= 1 && page <= book.pages.length) {
        flipbook.turn("page", page);
      }
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

function toggleDisplay() {
  const current = $("#flipbook").turn("display");
  const newDisplay = current === "double" ? "single" : "double";
  $("#flipbook").turn("display", newDisplay);
  resizeFlipbook();
}

function resizeFlipbook() {
  // ตรวจสอบว่า turn.js ทำงานหรือยัง
  if (!$("#flipbook").data().turn) return;

  const width = $(window).width();
  const height = $(window).height();
  const display = $("#flipbook").turn("display");
  
  // กำหนดสัดส่วน: หน้าคู่ (1.5) หรือ หน้าเดี่ยว (0.75)
  const aspectRatio = display === "double" ? 1.5 : 0.75;

  let newWidth = width - 40;
  let newHeight = newWidth / aspectRatio;

  if (newHeight > height - 100) {
    newHeight = height - 100;
    newWidth = newHeight * aspectRatio;
  }
  
  $("#flipbook").turn("size", newWidth, newHeight);
}