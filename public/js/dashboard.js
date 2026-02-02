let chartInstance = null;
let dashboardData = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Fetch Data
    const res = await fetch("/api/books/dashboard");
    if (!res.ok) throw new Error("Failed to fetch dashboard data");
    
    dashboardData = await res.json();
    const { totalBooks, myBooks, history } = dashboardData;

    // 2. Update Stats Cards
    document.getElementById("totalBooks").innerText = totalBooks;
    document.getElementById("myBooks").innerText = myBooks;

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