const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Main routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/shop.html", (req, res) => {
  res.sendFile(path.join(__dirname, "shop.html"));
});

app.get("/order.html", (req, res) => {
  res.sendFile(path.join(__dirname, "order.html"));
});

app.get("/payment.html", (req, res) => {
  res.sendFile(path.join(__dirname, "payment.html"));
});

app.get("/reviews.html", (req, res) => {
  res.sendFile(path.join(__dirname, "reviews.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-login.html"));
});

app.get("/chat.html", (req, res) => {
  res.sendFile(path.join(__dirname, "chat.html"));
});

app.get("/contact.html", (req, res) => {
  res.sendFile(path.join(__dirname, "contact.html"));
});

app.get("/cart.html", (req, res) => {
  res.sendFile(path.join(__dirname, "cart.html"));
});

app.get("/ladies.html", (req, res) => {
  res.sendFile(path.join(__dirname, "ladies.html"));
});

app.get("/kids.html", (req, res) => {
  res.sendFile(path.join(__dirname, "kids.html"));
});

// CSS and JS
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/img", express.static(path.join(__dirname, "img")));

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
});
