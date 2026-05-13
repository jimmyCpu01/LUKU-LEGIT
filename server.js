const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

const chatDataFile = path.join(__dirname, "chat-messages.json");

function readChatMessages() {
  try {
    if (!fs.existsSync(chatDataFile)) {
      fs.writeFileSync(chatDataFile, "[]", "utf-8");
    }
    const data = fs.readFileSync(chatDataFile, "utf-8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error("Error reading chat messages:", error);
    return [];
  }
}

function writeChatMessages(messages) {
  try {
    fs.writeFileSync(chatDataFile, JSON.stringify(messages, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing chat messages:", error);
  }
}

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

app.post("/api/chat-message", (req, res) => {
  const { sender, tel, email, content, image, timestamp, type } = req.body;
  if (!sender || !content) {
    return res.status(400).json({
      success: false,
      message: "Name and message content are required.",
    });
  }

  const messages = readChatMessages();
  messages.push({
    sender: sender.trim(),
    tel: tel ? tel.trim() : "",
    email: email ? email.trim() : "",
    content: content.trim(),
    image: image || null,
    timestamp: timestamp || new Date().toISOString(),
    type: type || "user",
  });
  writeChatMessages(messages);

  res.json({ success: true, message: "Chat message saved.", data: messages });
});

app.get("/api/chat-messages", (req, res) => {
  res.json({ success: true, data: readChatMessages() });
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

// Serve node_modules for client-side dependencies (like Speed Insights)
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
});
