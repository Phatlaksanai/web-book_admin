let allCodes = [];

document.addEventListener('DOMContentLoaded', () => {
    loadBooksForSelection();
    loadExistingCodes();

    const codeForm = document.getElementById('codeForm');
    codeForm.addEventListener('submit', handleCreateCode);

    const searchInput = document.getElementById('codeSearchInput');
    searchInput?.addEventListener('input', handleCodeSearch);
});

async function loadBooksForSelection() {
    try {
        const res = await fetch('/api/books');
        if (!res.ok) throw new Error('Failed to load books');
        const books = await res.json();

        const datalist = document.getElementById('bookOptions');
        datalist.innerHTML = ''; // Clear existing options

        books.forEach(book => {
            const option = document.createElement('option');
            option.value = book.title;
            option.dataset.id = book._id; // Store ID in data attribute
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

async function loadExistingCodes() {
    try {
        const res = await fetch('/api/books/codes');
        if (!res.ok) {
            let errorMsg = `Status: ${res.status}`;
            try {
                const errorData = await res.json();
                errorMsg = errorData.message || errorMsg;
            } catch (e) {
                errorMsg = `${res.status} - ${res.statusText}`;
            }
            throw new Error(errorMsg);
        }
        allCodes = await res.json();
        renderCodes(allCodes);
    } catch (error) {
        console.error('Error loading codes:', error);
        const tableBody = document.getElementById('codeTable');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</td></tr>`;
        }
    }
}

function renderCodes(codes) {
    const tableBody = document.getElementById('codeTable');
    tableBody.innerHTML = '';

    if (codes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">ไม่พบรหัสที่ตรงกัน</td></tr>';
        return;
    }

    codes.forEach(code => {
        const row = `
            <tr>
                <td><code class="fw-bold fs-6">${code.code}</code></td>
                <td class="text-start">${code.bookTitle}</td>
                <td>
                    ${code.used 
                        ? '<span class="badge bg-success">ใช้แล้ว</span>' 
                        : '<span class="badge bg-secondary">ยังไม่ใช้</span>'}
                </td>
                <td>${new Date(code.createdAt).toLocaleDateString()}</td>
                <td class="d-flex gap-2 justify-content-center">
                    <button class="btn btn-sm btn-outline-dark" title="Download QR Code" onclick="downloadImage('${code.qrImage?.url}', 'qr_${code.code}.png')" ${!code.qrImage?.url ? 'disabled' : ''}>QR</button>
                    <button class="btn btn-sm btn-outline-dark" title="Download Barcode" onclick="downloadImage('${code.barcodeImage?.url}', 'barcode_${code.code}.png')" ${!code.barcodeImage?.url ? 'disabled' : ''}>Barcode</button>
                    <button class="btn btn-sm btn-outline-danger" title="Delete Code" onclick="deleteBookCode('${code._id}')">🗑️</button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

function handleCodeSearch(event) {
    const keyword = event.target.value.toLowerCase();
    const filtered = allCodes.filter(c => 
        c.code.toLowerCase().includes(keyword) || 
        c.bookTitle.toLowerCase().includes(keyword));
    renderCodes(filtered);
}

async function handleCreateCode(event) {
    event.preventDefault();
    const bookInput = document.getElementById('bookInput');
    const selectedTitle = bookInput.value;

    // Find the selected book's ID from the datalist
    const options = document.querySelectorAll('#bookOptions option');
    let bookId = null;
    for (const option of options) {
        if (option.value === selectedTitle) {
            bookId = option.dataset.id;
            break;
        }
    }

    if (!bookId) {
        alert('กรุณาเลือกหนังสือที่มีอยู่ในรายการ');
        return;
    }

    try {
        const res = await fetch('/api/books/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId })
        });

        const result = await res.json();

        if (res.ok) {
            alert(result.message || 'สร้างรหัสสำเร็จ');
            bookInput.value = ''; // Clear input
            loadExistingCodes(); // Refresh table
        } else {
            throw new Error(result.message || 'สร้างรหัสไม่สำเร็จ');
        }
    } catch (error) {
        console.error('Error creating code:', error);
        alert(error.message);
    }
}

window.deleteBookCode = async function(codeId) {
    if (!confirm('คุณต้องการลบรหัสนี้ใช่หรือไม่?')) return;

    try {
        const res = await fetch(`/api/books/code/${codeId}`, { method: 'DELETE' });
        if (res.ok) {
            alert('ลบรหัสสำเร็จ');
            loadExistingCodes();
        } else {
            const result = await res.json();
            throw new Error(result.message || 'ลบไม่สำเร็จ');
        }
    } catch (error) {
        console.error('Error deleting code:', error);
        alert(error.message);
    }
}

window.downloadImage = async function(imageUrl, filename) {
    if (!imageUrl) return alert('ไม่พบรูปภาพสำหรับดาวน์โหลด');
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}