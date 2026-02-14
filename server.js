require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const auth = require("./middleware/auth");

const logger = require("./utils/logger");
const authRoutes = require("./routes/authRoutes");
const bookRoutes = require("./routes/bookRoutes");
const settingRoutes = require("./routes/settingRoutes");
const Admin = require("./models/User");
const app = express();

/* CONNECT DB */
connectDB();

mongoose.connection.once("open", async () => {
  try {
    await mongoose.connection.collection("books").dropIndex("bookCode_1");
    console.log("✅ Dropped old index: bookCode_1");
  } catch (err) { /* Index not found or already dropped */ }
});

/* CORS */
app.use(
  cors({
    origin: "http://localhost:2000",
    credentials: true,
  })
);

/* BODY PARSER */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* SESSION */
app.use(
  session({
    name: "connect.sid",
    secret: "admin-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  })
);

/* STATIC */
app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.use("/components", express.static(path.join(__dirname, "components")));

/* API */
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/settings", settingRoutes);

/* ROLE MIDDLEWARE */
const checkAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id || req.user;
    const user = await Admin.findById(userId);
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).send(`
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0b0f14; color:white; font-family:sans-serif;">
          <h1 style="color:#e74c3c;">403 Forbidden</h1>
          <p>Access Denied: Admins Only</p>
          <a href="/dashboard.html" style="color:#6aa9ff; text-decoration:none; margin-top:20px;">Back to Dashboard</a>
        </div>
      `);
    }
  } catch (err) {
    console.error("Role Check Error:", err);
    res.status(500).send("Server Error");
  }
};

/* PAGES */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/library", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "library.html"));
});

app.get("/addbook", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "addbook.html"));
});

app.get("/createCode", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "createCode.html"));
});
app.get("/addadmin", auth, checkAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "addAdmin.html"));
});

/* START */
app.listen(2000, () => {
  console.log("🚀 http://localhost:2000");
});
