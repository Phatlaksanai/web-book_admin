document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('id');

    if (bookId) {
        loadBookForEditing(bookId);
    }

    // Preview for cover image
    const coverInput = document.getElementById('cover');
    const coverPreview = document.getElementById('coverPreview');
    const previewText = document.getElementById('previewText');
    coverInput.addEventListener('change', () => {
        const file = coverInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                coverPreview.src = e.target.result;
                coverPreview.style.display = 'block';
                previewText.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Show PDF file name
    const pdfInput = document.getElementById('pdf');
    const pdfFileName = document.getElementById('pdfFileName');
    pdfInput.addEventListener('change', () => {
        if (pdfInput.files.length > 0) {
            pdfFileName.textContent = `Selected: ${pdfInput.files[0].name}`;
        } else {
            pdfFileName.textContent = '';
        }
    });
});

async function loadBookForEditing(id) {
    // Change UI for editing
    document.getElementById('pageTitle').textContent = '📝 แก้ไขข้อมูลหนังสือ';
    document.getElementById('submitBtn').textContent = 'อัปเดตข้อมูล';

    try {
        const res = await fetch(`/api/books/${id}`);
        if (!res.ok) throw new Error('Book not found');
        const book = await res.json();

        document.getElementById('title').value = book.title;
        document.getElementById('detail').value = book.detail;
        document.getElementById('tags').value = book.tags ? book.tags.join(', ') : '';

        if (book.coverImage?.url) {
            document.getElementById('coverPreview').src = book.coverImage.url;
            document.getElementById('coverPreview').style.display = 'block';
            document.getElementById('previewText').style.display = 'none';
        }
        if (book.pdfFile?.url) {
            document.getElementById('pdfFileName').textContent = `Current PDF: ${book.pdfFile.url.split('/').pop()}`;
        }

        // PDF is not required when editing
        document.getElementById('pdf').required = false;

    } catch (error) {
        console.error(error);
        alert('Failed to load book data.');
        window.location.href = '/library.html';
    }
}

async function submitBook() {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('id');
    
    const isEditMode = !!bookId;
    const url = isEditMode ? `/api/books/${bookId}` : '/api/books';
    const method = isEditMode ? 'PUT' : 'POST';

    const title = document.getElementById('title').value;
    const detail = document.getElementById('detail').value;
    const tags = document.getElementById('tags').value;
    const coverFile = document.getElementById('cover').files[0];
    const pdfFile = document.getElementById('pdf').files[0];
    const messageDiv = document.getElementById('create-message');
    const submitBtn = document.getElementById('submitBtn');

    if (!isEditMode && !pdfFile) {
        alert('กรุณาเลือกไฟล์ PDF');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('detail', detail);
    formData.append('tags', tags);
    if (coverFile) formData.append('cover', coverFile);
    if (pdfFile) formData.append('pdf', pdfFile);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    messageDiv.textContent = '';
    messageDiv.className = 'fw-bold';

    try {
        const res = await fetch(url, { method, body: formData });
        const result = await res.json();

        if (res.ok) {
            messageDiv.textContent = result.message || (isEditMode ? 'อัปเดตสำเร็จ!' : 'สร้างหนังสือสำเร็จ!');
            messageDiv.classList.add('text-success');
            setTimeout(() => { window.location.href = '/library.html'; }, 1500);
        } else {
            throw new Error(result.message || 'An error occurred');
        }

    } catch (error) {
        messageDiv.textContent = error.message;
        messageDiv.classList.add('text-danger');
        submitBtn.disabled = false;
        submitBtn.textContent = isEditMode ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล';
    }
}