let chartInstance = null;
let dashboardData = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Fetch Data
    const res = await fetch("/api/books/dashboard");
    if (!res.ok) throw new Error("Failed to fetch dashboard data");
    
    dashboardData = await res.json();
    const { totalBooks, myBooks, totalCodes, usedCodes, history, bookStats } = dashboardData;

    // 2. Update Stats Cards
    if(document.getElementById("totalBooks")) document.getElementById("totalBooks").innerText = totalBooks;
    if(document.getElementById("myBooks")) document.getElementById("myBooks").innerText = myBooks;
    if(document.getElementById("totalCodes")) document.getElementById("totalCodes").innerText = totalCodes;
    if(document.getElementById("usedCodes")) document.getElementById("usedCodes").innerText = usedCodes;

    // 3. Render Chart
    renderChart("books");

    // Listener for KPI selection
    const selector = document.getElementById("chartType");
    if (selector) {
      selector.addEventListener("change", (e) => {
        renderChart(e.target.value);
      });
    }

    // 4. Render History List
    renderHistory(history);

    // 5. Render Interest Chart (Scatter Plot)
    renderInterestChart(bookStats);

    // 6. Populate book selector for single book analysis
    populateBookSelector(bookStats);

  } catch (err) {
    console.error("Dashboard Error:", err);
  }
});

function renderChart(type) {
  const ctx = document.getElementById("bookChart");
  if (!ctx || !dashboardData) return;

  // Destroy previous chart
  if (chartInstance) {
    chartInstance.destroy();
  }

  let labels, data, colors;

  if (type === "books") {
    const { totalBooks, myBooks } = dashboardData;
    const others = totalBooks - myBooks;
    labels = ["หนังสือของฉัน", "หนังสือคนอื่น"];
    data = [myBooks, others];
    colors = ["#4e73df", "#e74a3b"];
  } else if (type === "codes") {
    const { totalCodes, usedCodes } = dashboardData;
    const available = totalCodes - usedCodes;
    labels = ["ถูกใช้แล้ว (Used)", "ยังไม่ใช้ (Available)"];
    data = [usedCodes, available];
    colors = ["#1cc88a", "#f6c23e"];
  }

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        hoverBorderColor: "rgba(234, 236, 244, 1)",
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        }
      },
      cutout: '70%',
    }
  });
}

function renderHistory(history) {
  const list = document.getElementById("historyList");
  if (!list) return;
  
  list.innerHTML = "";

  if (!history || history.length === 0) {
    list.innerHTML = `<li class="list-group-item text-center text-muted py-3">ยังไม่มีประวัติการเพิ่มหนังสือ</li>`;
    return;
  }

  history.forEach(book => {
    const date = new Date(book.createdAt).toLocaleDateString("th-TH", {
      day: "numeric", month: "short", year: "2-digit"
    });

    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center py-3";
    li.innerHTML = `
      <div class="d-flex align-items-center">
        <div class="bg-light rounded p-2 me-3 text-primary">
          📖
        </div>
        <div>
          <h6 class="mb-0 text-truncate" style="max-width: 200px;">${book.title}</h6>
          <small class="text-muted">เพิ่มเมื่อ ${date}</small>
        </div>
      </div>
    `;
    list.appendChild(li);
  });
}

function renderInterestChart(bookStats) {
  const ctx = document.getElementById("interestChart");
  if (!ctx || !bookStats) return;

  const dataPoints = bookStats.map(book => ({
    x: book.totalCodes,
    y: book.usedCodes,
    title: book.title
  }));

  new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'หนังสือ',
        data: dataPoints,
        backgroundColor: 'rgba(78, 115, 223, 0.6)',
        borderColor: 'rgba(78, 115, 223, 1)',
        borderWidth: 1,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const point = context.raw;
              return `${point.title}: สร้าง ${point.x} / ใช้ ${point.y}`;
            }
          }
        },
        legend: { display: false }
      },
      scales: {
        x: { title: { display: true, text: 'รหัสทั้งหมด (Total Codes)' }, beginAtZero: true, ticks: { precision: 0 } },
        y: { title: { display: true, text: 'รหัสที่ถูกใช้ (Used Codes)' }, beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function populateBookSelector(bookStats) {
    const selector = document.getElementById('bookSelector');
    if (!selector || !bookStats) return;

    bookStats.sort((a, b) => a.title.localeCompare(b.title)).forEach(book => {
        const option = document.createElement('option');
        option.value = book.title;
        option.textContent = book.title;
        selector.appendChild(option);
    });

    selector.addEventListener('change', (e) => {
        displaySingleBookAnalysis(e.target.value);
    });
}

function displaySingleBookAnalysis(title) {
    const resultDiv = document.getElementById('singleBookAnalysisResult');
    if (!resultDiv) return;

    if (!title) {
        resultDiv.innerHTML = '<p>เลือกหนังสือเพื่อดูข้อมูล</p>';
        resultDiv.className = 'text-center text-muted d-flex align-items-center justify-content-center p-3';
        return;
    }

    const bookData = dashboardData.bookStats.find(b => b.title === title);

    if (!bookData) {
        resultDiv.innerHTML = '<p class="text-danger">ไม่พบข้อมูลสำหรับหนังสือเล่มนี้</p>';
        return;
    }

    const used = bookData.usedCodes;
    const total = bookData.totalCodes;
    const available = total - used;
    const percentage = total > 0 ? ((used / total) * 100).toFixed(1) : 0;

    resultDiv.className = 'text-start p-3';
    resultDiv.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-5">
                <h5 class="fw-bold">สถิติรหัส (Code Stats)</h5>
                <ul class="list-unstyled mb-0">
                    <li><strong>สร้างทั้งหมด (Total):</strong> <span class="badge bg-primary rounded-pill fs-6">${total}</span></li>
                    <li><strong>ใช้ไปแล้ว (Used):</strong> <span class="badge bg-success rounded-pill fs-6">${used}</span></li>
                    <li><strong>คงเหลือ (Available):</strong> <span class="badge bg-warning text-dark rounded-pill fs-6">${available}</span></li>
                </ul>
            </div>
            <div class="col-md-7">
                <h5 class="fw-bold">อัตราการใช้งาน (Usage Rate)</h5>
                <div class="progress" style="height: 25px;">
                    <div class="progress-bar bg-success progress-bar-striped" role="progressbar" style="width: ${percentage}%;" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                        ${percentage}%
                    </div>
                </div>
                <small class="text-muted mt-1 d-block">
                    รหัสถูกใช้ไป ${used} จากทั้งหมด ${total} รหัส
                </small>
            </div>
        </div>
    `;
}