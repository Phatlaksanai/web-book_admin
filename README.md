# E-Book Admin Panel

## About

ระบบ **Admin Panel** สำหรับจัดการข้อมูลภายในแอปพลิเคชัน E-Book โดยผู้ดูแลระบบสามารถจัดการหนังสือและผู้ใช้งาน รวมถึงเพิ่ม แก้ไข และลบข้อมูลหนังสือภายในระบบ

## My Responsibilities

### Frontend Development

* พัฒนา Admin Panel ด้วย **HTML, CSS และ JavaScript**
* ออกแบบและพัฒนาหน้าจอสำหรับผู้ดูแลระบบ
* พัฒนาหน้าจอจัดการข้อมูลหนังสือ
* พัฒนาหน้าจอจัดการข้อมูลผู้ใช้งาน
* เชื่อมต่อ Frontend กับ Backend ผ่าน **REST API**
* แสดงข้อมูลหนังสือและผู้ใช้งานจาก Backend

### Backend Development

* พัฒนา Backend ด้วย **Node.js และ Express.js**
* พัฒนา REST API สำหรับจัดการข้อมูลหนังสือ
* พัฒนาฟังก์ชัน **เพิ่ม แก้ไข และลบหนังสือ (CRUD)**
* พัฒนา API สำหรับจัดการข้อมูลผู้ใช้งาน
* เชื่อมต่อ Backend กับ Database

### File Management

* เชื่อมต่อ **Cloudinary** สำหรับจัดเก็บไฟล์รูปภาพ
* จัดเก็บไฟล์ PDF ของหนังสือผ่าน Cloudinary
* จัดการ URL สำหรับเข้าถึงรูปภาพและไฟล์หนังสือ

## Technologies

### Frontend

* HTML
* CSS
* JavaScript

### Backend

* Node.js
* Express.js
* REST API

### Storage

* Cloudinary

## Main Features

* 📚 เพิ่มหนังสือ
* ✏️ แก้ไขข้อมูลหนังสือ
* 🗑️ ลบหนังสือ
* 📖 จัดการไฟล์ PDF หนังสือ
* 🖼️ จัดการรูปภาพหนังสือ
* 👤 จัดการข้อมูลผู้ใช้งาน
* 🔄 เชื่อมต่อข้อมูลระหว่าง Admin Panel และ Backend

## System Architecture

```text
Admin Panel
HTML + CSS + JavaScript
          │
          │ REST API
          ↓
   Node.js + Express
          │
          ├──────────→ Database
          │
          └──────────→ Cloudinary
                       ├── Book Cover Images
                       └── Book PDF Files
```
