require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");

const connectDB = require("./config/db");
const auth = require("./middleware/auth");

const authRoutes = require("./routes/authRoutes");
const bookRoutes = require("./routes/bookRoutes");
const adminRoutes = require("./routes/adminRoutes");
const app = express();

/* CONNECT DB */
connectDB();

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
app.use("/api/admin", adminRoutes);

/* STATIC */
app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.use("/components", express.static(path.join(__dirname, "components")));

/* API */
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

/* PAGES */
app.get("/", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/addadmin", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "addAdmin.html"));
});

/* START */
app.listen(2000, () => {
  console.log("🚀 http://localhost:2000");
});
