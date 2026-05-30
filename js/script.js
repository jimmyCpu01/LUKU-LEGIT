console.log("Script.js loaded successfully!");

const STORAGE_KEYS = {
  adminSession: "adminLoggedIn",
  userInteractions: "userInteractions",
  unauthorizedReports: "unauthorizedReports",
  pageAccessLog: "pageAccessLog",
  adminNotifications: "adminNotifications",
  payments: "payments",
  reviews: "reviews",
  chatMessages: "chatMessages",
  cart: "cart",
  adminOperations: "adminOperations",
  uploadedImages: "uploadedImages",
};

const ADMIN_PASSWORD_HASH =
  "ca96c3848839b87f8658ef8b38a13d939eb913b67718faece92a0a7713e3e609";

let modalState = {
  ready: false,
  element: null,
  image: null,
  sizeSelect: null,
  currentProduct: null,
};

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  return crypto.subtle.digest("SHA-256", msgBuffer).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}

function isAdminLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.adminSession) === "true";
}

function setAdminSession() {
  localStorage.setItem(STORAGE_KEYS.adminSession, "true");
}

function clearAdminSession() {
  localStorage.removeItem(STORAGE_KEYS.adminSession);
}

function logoutAdmin() {
  clearAdminSession();
  window.location.href = "admin-login.html";
}

function trackUserInteraction(action, details = {}) {
  const interactions = readJSON(STORAGE_KEYS.userInteractions, []);
  interactions.push({
    action,
    details,
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
  });
  writeJSON(STORAGE_KEYS.userInteractions, interactions.slice(-200));
}

function recordUnauthorizedAccess(context, reason) {
  const reports = readJSON(STORAGE_KEYS.unauthorizedReports, []);
  reports.push({
    context,
    reason,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    page: window.location.pathname,
  });
  writeJSON(STORAGE_KEYS.unauthorizedReports, reports.slice(-100));
}

function recordPageAccess() {
  const pageAccessLog = readJSON(STORAGE_KEYS.pageAccessLog, []);
  const entry = {
    page: window.location.pathname,
    pageName: (document.body?.dataset?.page || "unknown").replace(/-/g, " "),
    timestamp: new Date().toISOString(),
    referrer: document.referrer || "direct",
    userAgent: navigator.userAgent,
  };
  pageAccessLog.push(entry);
  writeJSON(STORAGE_KEYS.pageAccessLog, pageAccessLog.slice(-250));

  trackUserInteraction("page_view", {
    page: entry.page,
    pageName: entry.pageName,
  });
}

function pushAdminNotification(type, message, details = {}) {
  const notifications = readJSON(STORAGE_KEYS.adminNotifications, []);
  notifications.push({
    type,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
  writeJSON(STORAGE_KEYS.adminNotifications, notifications.slice(-250));
}

function initAdminPage() {
  if (document.body.dataset.page !== "admin") return;
  if (!isAdminLoggedIn()) {
    recordUnauthorizedAccess("direct-admin-page", "page-load");
    window.location.href = "admin-login.html";
    return;
  }
  // rest of your code
  pushAdminNotification("admin_open", "Admin dashboard opened.", {
    page: window.location.pathname,
  });
}

function seedStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.payments)) {
    writeJSON(STORAGE_KEYS.payments, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.reviews)) {
    writeJSON(STORAGE_KEYS.reviews, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.chatMessages)) {
    writeJSON(STORAGE_KEYS.chatMessages, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.cart)) {
    writeJSON(STORAGE_KEYS.cart, []);
  }
}

function buyNow(name, price, condition) {
  const product = { name, price, condition };
  localStorage.setItem("selectedProduct", JSON.stringify(product));
  trackUserInteraction("buy_now", product);
  window.location.href = "payment.html";
}

function orderNow(name, price, condition, size = "") {
  const product = { name, price, condition, size };
  localStorage.setItem("selectedProduct", JSON.stringify(product));
  trackUserInteraction("order_now", product);
  window.location.href = "order.html";
}

function addToCart(product) {
  const cart = readJSON(STORAGE_KEYS.cart, []);
  cart.push(product);
  writeJSON(STORAGE_KEYS.cart, cart);
  trackUserInteraction("add_to_cart", product);
}

async function promptAdminAccess(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const token = button?.dataset?.adminToken || "";
  const decoded = token ? atob(token) : "";

  if (decoded !== "admin-token") {
    recordUnauthorizedAccess("admin-button", "invalid-token");
    alert("Admin access is restricted.");
    return;
  }

  trackUserInteraction("admin_access_button_clicked", {
    page: window.location.pathname,
  });
  window.location.href = "admin-login.html";
}

function initPageAdminButton() {
  const adminBtn = document.getElementById("admin-access-btn");
  if (!adminBtn) return;
  adminBtn.addEventListener("click", promptAdminAccess);
  adminBtn.style.cursor = "pointer";
}

function initAdminLoginPage() {
  if (document.body.dataset.page !== "admin-login") return;

  const loginForm = document.getElementById("admin-login-form");
  const errorDisplay = document.getElementById("login-error");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const passwordEl = document.getElementById("admin-password");
    const password = passwordEl ? passwordEl.value.trim() : "";

    if (!password) {
      if (errorDisplay) errorDisplay.textContent = "Password cannot be empty.";
      return;
    }

    const hash = await hashPassword(password);
    if (hash === ADMIN_PASSWORD_HASH) {
      setAdminSession();
      trackUserInteraction("admin_login_success", {
        source: "admin_login_page",
      });
      window.location.href = "admin.html";
      return;
    }

    recordUnauthorizedAccess("admin-login-page", "invalid-password");
    if (errorDisplay) {
      errorDisplay.textContent =
        "Invalid password. This attempt has been reported.";
    }
  });
}

function ensureAdminNoticeBanner() {
  const adminHeader = document.querySelector(".admin-header");
  if (!adminHeader || document.getElementById("admin-notice-banner")) return;

  const banner = document.createElement("div");
  banner.id = "admin-notice-banner";
  banner.className = "admin-notice-banner";
  adminHeader.insertAdjacentElement("afterend", banner);
}

function renderAdminNoticeBanner() {
  const banner = document.getElementById("admin-notice-banner");
  if (!banner) return;

  const accessLog = readJSON(STORAGE_KEYS.pageAccessLog, []);
  const unauthorized = readJSON(STORAGE_KEYS.unauthorizedReports, []);

  banner.innerHTML = `
    <div class="admin-notice-summary">
      <strong>Admin alerts are active.</strong>
      <span>${accessLog.length} page access event(s) · ${unauthorized.length} security alert(s)</span>
    </div>
    <div class="admin-notice-list">
      ${accessLog
        .slice(-4)
        .reverse()
        .map(
          (item) => `
            <div class="admin-notice-item">
              <strong>${item.pageName}</strong>
              <span>${new Date(item.timestamp).toLocaleString()}</span>
              <small>${item.referrer === "direct" ? "Direct access" : `Referrer: ${item.referrer}`}</small>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
  banner.classList.add("visible");
}

function loadOverviewStats() {
  seedStorage();

  const payments = readJSON(STORAGE_KEYS.payments, []);
  const interactions = readJSON(STORAGE_KEYS.userInteractions, []);
  const reviews = readJSON(STORAGE_KEYS.reviews, []);
  const cart = readJSON(STORAGE_KEYS.cart, []);
  const chats = readJSON(STORAGE_KEYS.chatMessages, []);
  const accessLog = readJSON(STORAGE_KEYS.pageAccessLog, []);
  const unauthorized = readJSON(STORAGE_KEYS.unauthorizedReports, []);

  updateStatWithAnimation(
    "stat-payments",
    payments.filter((p) => p.status === "pending").length,
  );
  updateStatWithAnimation(
    "stat-completed-payments",
    payments.filter((p) => p.status === "completed").length,
  );
  updateStatWithAnimation("stat-users", interactions.length);
  updateStatWithAnimation("stat-reviews", reviews.length);
  updateStatWithAnimation("stat-cart-items", cart.length);
  updateStatWithAnimation("stat-total-chats", chats.length);
  updateStatWithAnimation(
    "stat-alerts",
    accessLog.length + unauthorized.length,
  );

  loadActivityLog();
  renderAdminNoticeBanner();
}

function updateStatWithAnimation(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = String(value);
}

function loadActivityLog() {
  const container = document.getElementById("activity-log");
  if (!container) return;

  const accessLog = readJSON(STORAGE_KEYS.pageAccessLog, []);
  container.innerHTML = "";

  if (!accessLog.length) {
    container.innerHTML =
      '<div class="data-item"><p>No page access events recorded yet.</p></div>';
    return;
  }

  accessLog
    .slice(-12)
    .reverse()
    .forEach((item) => {
      const div = document.createElement("div");
      div.className = "data-item";
      div.innerHTML = `
        <p><strong>${item.pageName}</strong></p>
        <p>${new Date(item.timestamp).toLocaleString()}</p>
        <small>${item.referrer === "direct" ? "Direct access" : `Referrer: ${item.referrer}`}</small>
      `;
      container.appendChild(div);
    });
}

function initAdminPage() {
  if (document.body.dataset.page !== "admin") return;

  if (!isAdminLoggedIn()) {
    recordUnauthorizedAccess("direct-admin-page", "page-load");
    window.location.href = "admin-login.html";
    return;
  }

  ensureAdminNoticeBanner();
  pushAdminNotification("admin_open", "Admin dashboard opened.", {
    page: window.location.pathname,
  });

  const adminPanel = document.getElementById("admin-panel");
  const logoutBtn = document.getElementById("logout-btn");
  const tabs = document.querySelectorAll(".tab-btn");

  if (adminPanel) adminPanel.style.display = "block";
  loadOverviewStats();
  trackUserInteraction("admin_dashboard_opened", {
    page: window.location.pathname,
  });

  tabs.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");
      tabs.forEach((btn) => btn.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });

      this.classList.add("active");
      const target = document.getElementById(tabId);
      if (target) {
        target.classList.add("active");
        loadTabData(tabId);
      }
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to logout?")) logoutAdmin();
    });
  }
}

function loadTabData(tabId) {
  switch (tabId) {
    case "overview":
      loadOverviewStats();
      break;
    case "payments":
      loadPendingPayments();
      break;
    case "users":
      loadUserReport();
      break;
    case "reviews":
      loadReviewModeration();
      break;
    case "security":
      loadSecurityReport();
      break;
    case "operations":
      loadOperationsPanel();
      break;
    case "chats":
      loadChats();
      break;
    case "images":
      loadImages();
      break;
    case "complete-report":
      loadCompleteReport();
      break;
    default:
      break;
  }
}

function loadPendingPayments() {
  const container = document.getElementById("payments-list");
  const alertBanner = document.getElementById("payment-alert-banner");
  if (!container) return;

  const notifications = readJSON("paymentNotifications", []);
  if (alertBanner) {
    alertBanner.innerHTML = notifications.length
      ? `<p style="margin:0; font-weight:700;">${notifications.length} new payment page visit(s)</p><p style="margin:0.5rem 0 0 0;">Latest visit: ${new Date(notifications[notifications.length - 1].timestamp).toLocaleString()}.</p>`
      : '<p style="margin:0; color: var(--text-dim);">No new payment page visits since last refresh.</p>';
  }

  const payments = readJSON(STORAGE_KEYS.payments, []);
  container.innerHTML = "";

  if (!payments.length) {
    container.innerHTML =
      '<div class="data-item"><p>No payments found.</p></div>';
    return;
  }

  payments.forEach((payment, index) => {
    const div = document.createElement("div");
    div.className = "data-item";
    div.innerHTML = `
      <h4>${payment.product || payment.name || "Payment"}</h4>
      <p><strong>User:</strong> ${payment.name || payment.user || "Guest"}</p>
      <p><strong>Size:</strong> ${payment.size || "N/A"}</p>
      <p><strong>Email:</strong> ${payment.email || "N/A"}</p>
      <p><strong>Phone:</strong> ${payment.phone || "N/A"}</p>
      <p><strong>Amount:</strong> Ksh ${payment.amount || 0}</p>
      <p><strong>Status:</strong> ${(payment.status || "pending").toUpperCase()}</p>
      <p><strong>Date:</strong> ${new Date(payment.timestamp || Date.now()).toLocaleString()}</p>
      ${payment.proofImage ? `<img src="${payment.proofImage}" alt="Payment proof" style="max-width:100%; max-height:260px; border-radius:12px; margin:0.75rem 0;" />` : ""}
      ${payment.status === "pending" ? `<button class="btn btn-small" onclick="confirmPayment(${index})">Confirm Payment</button>` : ""}
    `;
    container.appendChild(div);
  });
}

function confirmPayment(index) {
  const payments = readJSON(STORAGE_KEYS.payments, []);
  if (!payments[index]) return;
  payments[index].status = "completed";
  writeJSON(STORAGE_KEYS.payments, payments);
  loadPendingPayments();
  alert("Payment confirmed.");
}

function loadUserReport() {
  const container = document.getElementById("users-list");
  if (!container) return;

  const interactions = readJSON(STORAGE_KEYS.userInteractions, []);
  container.innerHTML = "";

  if (!interactions.length) {
    container.innerHTML =
      '<div class="data-item"><p>No user interactions recorded.</p></div>';
    return;
  }

  interactions
    .slice(-20)
    .reverse()
    .forEach((item) => {
      const div = document.createElement("div");
      div.className = "data-item";
      div.innerHTML = `
        <p><strong>${item.action}</strong></p>
        <p>${new Date(item.timestamp).toLocaleString()}</p>
        <small>${item.page}</small>
      `;
      container.appendChild(div);
    });
}

function loadReviewModeration() {
  const container = document.getElementById("reviews-list");
  if (!container) return;

  const reviews = readJSON(STORAGE_KEYS.reviews, []);
  container.innerHTML = `
    <div class="admin-form-shell">
      <h3>Add Review</h3>
      <form id="admin-review-form" class="login-form">
        <input id="admin-review-name" type="text" placeholder="Customer name" required />
        <input id="admin-review-rating" type="number" min="1" max="5" value="5" required />
        <textarea id="admin-review-text" rows="4" placeholder="Review text" required></textarea>
        <button type="submit" class="btn btn-primary">Add Review</button>
      </form>
    </div>
    <div id="admin-review-list" class="data-list"></div>
  `;

  const form = document.getElementById("admin-review-form");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      addAdminReview();
    });
  }

  const list = document.getElementById("admin-review-list");
  if (!list) return;

  if (!reviews.length) {
    list.innerHTML =
      '<div class="data-item"><p>No reviews to moderate.</p></div>';
    return;
  }

  reviews
    .slice()
    .reverse()
    .forEach((review, reverseIndex) => {
      const index = reviews.length - 1 - reverseIndex;
      const div = document.createElement("div");
      div.className = "data-item";
      div.innerHTML = `
        <p><strong>${review.name}</strong> - ${Number(review.rating) || 0}★</p>
        <p>${review.text}</p>
        <small>${new Date(review.timestamp || Date.now()).toLocaleString()} · ${review.approved ? "Approved" : "Pending"}</small>
        <div class="dialog-actions" style="margin-top:1rem;">
          <button class="btn btn-small" onclick="editReview(${index})">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteReview(${index})">Remove</button>
          ${
            review.approved
              ? '<span class="btn btn-small" style="pointer-events:none; opacity:.75;">Approved</span>'
              : `<button class="btn btn-small btn-primary" onclick="approveReview(${index})">Approve</button>`
          }
        </div>
      `;
      list.appendChild(div);
    });
}

function addAdminReview() {
  const name = document.getElementById("admin-review-name")?.value.trim();
  const rating = Number(
    document.getElementById("admin-review-rating")?.value || 0,
  );
  const text = document.getElementById("admin-review-text")?.value.trim();

  if (!name || !text || rating < 1 || rating > 5) {
    alert("Enter a valid review name, rating, and text.");
    return;
  }

  const reviews = readJSON(STORAGE_KEYS.reviews, []);
  reviews.push({
    name,
    rating,
    text,
    timestamp: new Date().toISOString(),
    approved: true,
    source: "admin",
  });

  writeJSON(STORAGE_KEYS.reviews, reviews);
  trackUserInteraction("admin_review_added", { name, rating });
  loadReviewModeration();
}

function editReview(index) {
  const reviews = readJSON(STORAGE_KEYS.reviews, []);
  const review = reviews[index];
  if (!review) return;

  const name = prompt("Edit review name", review.name);
  if (name === null) return;
  const rating = prompt("Edit rating from 1 to 5", String(review.rating || 5));
  if (rating === null) return;
  const text = prompt("Edit review text", review.text);
  if (text === null) return;

  reviews[index] = {
    ...review,
    name: name.trim() || review.name,
    rating: Math.max(1, Math.min(5, Number(rating) || review.rating || 5)),
    text: text.trim() || review.text,
    timestamp: new Date().toISOString(),
  };

  writeJSON(STORAGE_KEYS.reviews, reviews);
  trackUserInteraction("admin_review_edited", { index });
  loadReviewModeration();
}

function deleteReview(index) {
  if (!confirm("Remove this review?")) return;
  const reviews = readJSON(STORAGE_KEYS.reviews, []);
  reviews.splice(index, 1);
  writeJSON(STORAGE_KEYS.reviews, reviews);
  trackUserInteraction("admin_review_removed", { index });
  loadReviewModeration();
}

function approveReview(index) {
  const reviews = readJSON(STORAGE_KEYS.reviews, []);
  if (!reviews[index]) return;
  reviews[index].approved = true;
  writeJSON(STORAGE_KEYS.reviews, reviews);
  trackUserInteraction("admin_review_approved", { index });
  loadReviewModeration();
}

function loadSecurityReport() {
  const container = document.getElementById("security-list");
  if (!container) return;

  const unauthorized = readJSON(STORAGE_KEYS.unauthorizedReports, []);
  const accessLog = readJSON(STORAGE_KEYS.pageAccessLog, []);
  container.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "data-item";
  summary.innerHTML = `
    <p><strong>Security summary</strong></p>
    <p>Unauthorized attempts: ${unauthorized.length}</p>
    <p>Page access events: ${accessLog.length}</p>
  `;
  container.appendChild(summary);

  const combined = [
    ...unauthorized.map((item) => ({
      label: `${item.reason} · ${item.context}`,
      timestamp: item.timestamp,
      details: item.page || "unknown page",
    })),
    ...accessLog.map((item) => ({
      label: item.pageName,
      timestamp: item.timestamp,
      details:
        item.referrer === "direct"
          ? "Direct access"
          : `Referrer: ${item.referrer}`,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  combined.slice(0, 20).forEach((item) => {
    const div = document.createElement("div");
    div.className = "data-item";
    div.innerHTML = `
      <p><strong>${item.label}</strong></p>
      <p>${new Date(item.timestamp).toLocaleString()}</p>
      <small>${item.details}</small>
    `;
    container.appendChild(div);
  });
}

function loadOperationsPanel() {
  const container = document.getElementById("operations-panel");
  if (!container) return;

  const operations = readJSON(STORAGE_KEYS.adminOperations, {});
  container.innerHTML = `
    <form id="operations-form" class="login-form">
      <div class="form-group">
        <label for="maintenance-mode">Maintenance Mode:</label>
        <select id="maintenance-mode">
          <option value="off" ${operations.maintenanceMode === "off" ? "selected" : ""}>Off</option>
          <option value="on" ${operations.maintenanceMode === "on" ? "selected" : ""}>On</option>
        </select>
      </div>
      <div class="form-group">
        <label for="auto-approve-reviews">Auto-Approve Reviews:</label>
        <select id="auto-approve-reviews">
          <option value="off" ${operations.autoApproveReviews === "off" ? "selected" : ""}>Off</option>
          <option value="on" ${operations.autoApproveReviews === "on" ? "selected" : ""}>On</option>
        </select>
      </div>
      <div class="form-group">
        <label for="order-confirmation">Order Confirmation:</label>
        <select id="order-confirmation">
          <option value="manual" ${operations.orderConfirmation === "manual" ? "selected" : ""}>Manual</option>
          <option value="auto" ${operations.orderConfirmation === "auto" ? "selected" : ""}>Auto</option>
        </select>
      </div>
      <div class="form-group">
        <label for="admin-note">Admin Note:</label>
        <textarea id="admin-note" rows="3" placeholder="Internal notes...">${operations.adminNote || ""}</textarea>
      </div>
      <button type="button" class="btn" onclick="saveAdminOperations()">Save Operations</button>
    </form>
  `;
}

function saveAdminOperations() {
  const operations = {
    maintenanceMode:
      document.getElementById("maintenance-mode")?.value || "off",
    autoApproveReviews:
      document.getElementById("auto-approve-reviews")?.value || "off",
    orderConfirmation:
      document.getElementById("order-confirmation")?.value || "manual",
    adminNote: document.getElementById("admin-note")?.value || "",
  };
  writeJSON(STORAGE_KEYS.adminOperations, operations);
  trackUserInteraction("admin_operations_saved", operations);
  alert("Admin operations saved.");
}

async function loadChats() {
  const container = document.getElementById("chats-list");
  if (!container) return;

  const chats = readJSON(STORAGE_KEYS.chatMessages, []);
  container.innerHTML = `
    <div class="admin-form-shell">
      <h3>Add Chat Message</h3>
      <form id="admin-chat-form" class="login-form">
        <input id="admin-chat-sender" type="text" placeholder="Sender name" required />
        <input id="admin-chat-tel" type="text" placeholder="Phone number" />
        <input id="admin-chat-email" type="email" placeholder="Email" />
        <textarea id="admin-chat-content" rows="4" placeholder="Message content" required></textarea>
        <button type="submit" class="btn btn-primary">Add Chat</button>
      </form>
    </div>
    <div id="admin-chat-list" class="data-list"></div>
  `;

  const form = document.getElementById("admin-chat-form");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      addAdminChat();
    });
  }

  const list = document.getElementById("admin-chat-list");
  if (!list) return;

  if (!chats.length) {
    list.innerHTML = '<div class="data-item"><p>No chat messages.</p></div>';
    return;
  }

  chats
    .slice()
    .reverse()
    .forEach((chat, reverseIndex) => {
      const index = chats.length - 1 - reverseIndex;
      const div = document.createElement("div");
      div.className = "data-item";
      let html = `
        <p><strong>${chat.sender || "Guest"}</strong></p>
        ${chat.tel ? `<p><strong>Phone:</strong> ${chat.tel}</p>` : ""}
        ${chat.email ? `<p><strong>Email:</strong> ${chat.email}</p>` : ""}
        <p>${chat.content || ""}</p>
      `;
      if (chat.image) {
        html += `<img src="${chat.image}" alt="Attached image" style="max-width:220px; max-height:220px; border-radius:14px; margin-top:0.75rem;">`;
      }
      html += `
        <small>${new Date(chat.timestamp || Date.now()).toLocaleString()}</small>
        <div class="dialog-actions" style="margin-top:1rem;">
          <button class="btn btn-small" onclick="editChat(${index})">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteChat(${index})">Remove</button>
        </div>
      `;
      div.innerHTML = html;
      list.appendChild(div);
    });
}

function addAdminChat() {
  const sender = document.getElementById("admin-chat-sender")?.value.trim();
  const tel = document.getElementById("admin-chat-tel")?.value.trim();
  const email = document.getElementById("admin-chat-email")?.value.trim();
  const content = document.getElementById("admin-chat-content")?.value.trim();

  if (!sender || !content) {
    alert("Sender and message content are required.");
    return;
  }

  const chats = readJSON(STORAGE_KEYS.chatMessages, []);
  chats.push({
    sender,
    tel,
    email,
    content,
    image: null,
    timestamp: new Date().toISOString(),
    type: "admin",
  });

  writeJSON(STORAGE_KEYS.chatMessages, chats);
  trackUserInteraction("admin_chat_added", { sender });
  loadChats();
}

function editChat(index) {
  const chats = readJSON(STORAGE_KEYS.chatMessages, []);
  const chat = chats[index];
  if (!chat) return;

  const sender = prompt("Edit sender", chat.sender || "");
  if (sender === null) return;
  const tel = prompt("Edit phone", chat.tel || "");
  if (tel === null) return;
  const email = prompt("Edit email", chat.email || "");
  if (email === null) return;
  const content = prompt("Edit message content", chat.content || "");
  if (content === null) return;

  chats[index] = {
    ...chat,
    sender: sender.trim() || chat.sender,
    tel: tel.trim(),
    email: email.trim(),
    content: content.trim() || chat.content,
    timestamp: new Date().toISOString(),
  };

  writeJSON(STORAGE_KEYS.chatMessages, chats);
  trackUserInteraction("admin_chat_edited", { index });
  loadChats();
}

function deleteChat(index) {
  if (!confirm("Remove this chat message?")) return;
  const chats = readJSON(STORAGE_KEYS.chatMessages, []);
  chats.splice(index, 1);
  writeJSON(STORAGE_KEYS.chatMessages, chats);
  trackUserInteraction("admin_chat_removed", { index });
  loadChats();
}

function loadImages() {
  const container = document.getElementById("images-list");
  if (!container) return;

  const images = readJSON(STORAGE_KEYS.uploadedImages, []);
  container.innerHTML = "";

  if (!images.length) {
    container.innerHTML =
      '<div class="data-item"><p>No images uploaded.</p></div>';
    return;
  }

  images
    .slice(-20)
    .reverse()
    .forEach((image) => {
      const div = document.createElement("div");
      div.className = "data-item";
      div.innerHTML = `<p><strong>Uploaded:</strong> ${new Date(image.timestamp || Date.now()).toLocaleString()}</p>`;
      container.appendChild(div);
    });
}

function loadCompleteReport() {
  const container = document.getElementById("report-container");
  if (!container) return;

  const payments = readJSON(STORAGE_KEYS.payments, []);
  const interactions = readJSON(STORAGE_KEYS.userInteractions, []);
  const reviews = readJSON(STORAGE_KEYS.reviews, []);
  const chats = readJSON(STORAGE_KEYS.chatMessages, []);
  const accessLog = readJSON(STORAGE_KEYS.pageAccessLog, []);

  container.innerHTML = `
    <h4>Total Payments: ${payments.length}</h4>
    <p>Pending: ${payments.filter((p) => p.status === "pending").length}</p>
    <p>Completed: ${payments.filter((p) => p.status === "completed").length}</p>
    <hr>
    <h4>Total Interactions: ${interactions.length}</h4>
    <p>Total Chat Messages: ${chats.length}</p>
    <p>Total Reviews: ${reviews.length}</p>
    <p>Page Access Events: ${accessLog.length}</p>
  `;
}

function initInteractive3DEffects() {
  document
    .querySelectorAll(
      ".shoe-card, .panel-card, .contact-card, .data-item, .recommendation-item",
    )
    .forEach((card) => {
      card.addEventListener("pointermove", function (event) {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        const rotateX = (y / rect.height) * 8;
        const rotateY = (x / rect.width) * -8;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
}

function buildImageModal() {
  if (modalState.ready) return;

  const isKidsPage = document.body.dataset.page === "kids";
  const start = isKidsPage ? 19 : 36;
  const end = isKidsPage ? 35 : 45;
  let sizeOptions =
    '<option value="" selected disabled>Select your EUR size</option>';
  for (let size = start; size <= end; size += 1) {
    sizeOptions += `<option value="EUR ${size}">EUR ${size}</option>`;
  }

  const modalHTML = `
    <div id="imageModal" class="modal" aria-hidden="true">
      <span class="close" aria-label="Close">&times;</span>
      <div class="modal-content-grid">
        <img class="modal-image" id="modalImage" alt="" />
        <div class="modal-buttons">
          <button class="btn" id="addToCartBtn" type="button">Add to Cart</button>
          <button class="btn btn-secondary" id="orderNowBtn" type="button">Order Now</button>
          <button class="btn btn-primary" id="moreLikeBtn" type="button">More Like These</button>
        </div>
      </div>
      <div class="modal-size">
        <label for="sizeSelect">Select Size (EUR):</label>
        <select id="sizeSelect">${sizeOptions}</select>
        <div class="size-help">
          <p>Need help finding your perfect fit? Start a quick size chat before choosing.</p>
          <button type="button" class="btn btn-secondary" id="sizeHelpBtn">Shoe Size Chat</button>
        </div>
      </div>
    </div>
    <div id="moreLikeModal" class="modal more-like-modal" aria-hidden="true">
      <div class="more-like-card">
        <div class="more-like-header">
          <div>
            <span class="label">Premium Match</span>
            <h2>More like <span id="moreLikeTitle">These</span></h2>
            <p id="moreLikeDescription">Explore premium matches, preview top styles, or message us instantly.</p>
          </div>
          <button class="more-like-close" id="moreLikeClose" type="button">&times;</button>
        </div>
        <div class="recommendation-list" id="recommendationList"></div>
        <div class="dialog-actions">
          <button class="btn btn-primary" id="whatsappMoreBtn" type="button">Send catalogue on WhatsApp</button>
          <button class="btn btn-secondary" id="googleMoreBtn" type="button">Search similar images</button>
          <button class="btn" id="backToProductBtn" type="button">Back to product</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  modalState.ready = true;
  modalState.element = document.getElementById("imageModal");
  modalState.image = document.getElementById("modalImage");
  modalState.sizeSelect = document.getElementById("sizeSelect");
  modalState.currentProduct = null;

  const moreLikeModal = document.getElementById("moreLikeModal");
  const closeBtn = modalState.element.querySelector(".close");
  const addToCartBtn = document.getElementById("addToCartBtn");
  const orderNowBtn = document.getElementById("orderNowBtn");
  const moreLikeBtn = document.getElementById("moreLikeBtn");
  const moreLikeClose = document.getElementById("moreLikeClose");
  const backToProductBtn = document.getElementById("backToProductBtn");
  const sizeHelpBtn = document.getElementById("sizeHelpBtn");
  const whatsappMoreBtn = document.getElementById("whatsappMoreBtn");
  const googleMoreBtn = document.getElementById("googleMoreBtn");
  const moreLikeTitle = document.getElementById("moreLikeTitle");
  const moreLikeDescription = document.getElementById("moreLikeDescription");
  const recommendationList = document.getElementById("recommendationList");

  function closeModal() {
    modalState.element.style.display = "none";
    modalState.element.setAttribute("aria-hidden", "true");
    if (moreLikeModal) {
      moreLikeModal.style.display = "none";
      moreLikeModal.setAttribute("aria-hidden", "true");
    }
  }

  function getRecommendations(currentName) {
    return Array.from(document.querySelectorAll(".shoe-card img"))
      .filter((img) => img.alt && img.alt !== currentName)
      .slice(0, 4)
      .map((img) => {
        const card = img.closest(".shoe-card");
        return {
          label:
            card?.querySelector("h3")?.textContent?.trim() ||
            img.alt ||
            "Similar product",
          src: img.src,
        };
      });
  }

  function renderRecommendations(productName) {
    const suggestions = getRecommendations(productName);
    recommendationList.innerHTML = suggestions
      .map(
        (item, index) => `
          <button class="recommendation-item" type="button" data-query="${encodeURIComponent(item.label)}">
            <img src="${item.src}" alt="${item.label}">
            <div>
              <strong>${item.label}</strong>
              <span>Premium match ${index + 1}</span>
            </div>
          </button>
        `,
      )
      .join("");

    recommendationList
      .querySelectorAll(".recommendation-item")
      .forEach((item) => {
        item.addEventListener("click", function () {
          const query = this.dataset.query || "";
          const label =
            this.querySelector("strong")?.textContent || "Curated match";
          moreLikeTitle.textContent = label;
          moreLikeDescription.textContent = `Ready to explore ${label}. Choose WhatsApp for a catalogue or search similar styles.`;
          whatsappMoreBtn.dataset.query = query;
          googleMoreBtn.dataset.query = query;
          recommendationList
            .querySelectorAll(".recommendation-item")
            .forEach((card) => {
              card.classList.toggle("active", card === this);
            });
        });
      });
  }

  function openMoreLikeModal(productName) {
    if (!moreLikeModal) return;
    moreLikeModal.style.display = "block";
    moreLikeModal.setAttribute("aria-hidden", "false");
    moreLikeTitle.textContent = productName || "These";
    moreLikeDescription.textContent =
      "Tap a curated match below, then choose WhatsApp or Google to connect instantly.";
    whatsappMoreBtn.dataset.query = encodeURIComponent(
      `${productName || "premium shoes"} shoes`,
    );
    googleMoreBtn.dataset.query = encodeURIComponent(
      `${productName || "premium shoes"} shoes`,
    );
    renderRecommendations(productName);
  }

  function openProductModal(img) {
    const card = img.closest(".shoe-card");
    const priceText = card?.querySelector(".price")?.textContent || "";
    const price = parseInt(priceText.replace(/[^\d]/g, ""), 10) || 0;
    const condition = card?.querySelector(".shoe-specs")?.textContent || "";
    const name = img.alt || card?.querySelector("h3")?.textContent || "Product";

    modalState.element.style.display = "block";
    modalState.element.setAttribute("aria-hidden", "false");
    modalState.image.src = img.src;
    modalState.image.alt = name;
    modalState.currentProduct = { name, price, condition, image: img.src };

    if (modalState.sizeSelect) modalState.sizeSelect.selectedIndex = 0;

    trackUserInteraction("product_image_opened", { name, price, condition });
  }

  document.querySelectorAll(".shoe-card img").forEach((img) => {
    img.style.cursor = "pointer";
    img.style.pointerEvents = "auto";
    img.addEventListener("click", () => openProductModal(img));
  });

  closeBtn?.addEventListener("click", closeModal);
  modalState.element.addEventListener("click", (event) => {
    if (event.target === modalState.element) closeModal();
  });

  addToCartBtn?.addEventListener("click", () => {
    if (!modalState.currentProduct) return;
    addToCart({
      ...modalState.currentProduct,
      size: modalState.sizeSelect?.value || "",
    });
    alert("Added to cart.");
  });

  orderNowBtn?.addEventListener("click", () => {
    if (!modalState.currentProduct) return;
    const size = modalState.sizeSelect?.value || "";
    orderNow(
      modalState.currentProduct.name,
      modalState.currentProduct.price,
      modalState.currentProduct.condition,
      size,
    );
  });

  moreLikeBtn?.addEventListener("click", () => {
    if (!modalState.currentProduct) return;
    openMoreLikeModal(modalState.currentProduct.name);
  });

  moreLikeClose?.addEventListener("click", closeModal);
  backToProductBtn?.addEventListener("click", closeModal);

  sizeHelpBtn?.addEventListener("click", () => {
    window.location.href = "chat.html#chat-form";
  });

  whatsappMoreBtn?.addEventListener("click", function () {
    const query = this.dataset.query || encodeURIComponent("premium shoes");
    window.open(
      `https://wa.me/254700408174?text=${query}`,
      "_blank",
      "noopener",
    );
  });

  googleMoreBtn?.addEventListener("click", function () {
    const query = this.dataset.query || encodeURIComponent("premium shoes");
    window.open(
      `https://www.google.com/search?tbm=isch&q=${query}`,
      "_blank",
      "noopener",
    );
  });
}

function enhanceBuyNowButtons() {
  document.querySelectorAll("button, a").forEach((el) => {
    const text = (el.textContent || "").trim().toLowerCase();
    const onclick = el.getAttribute("onclick") || "";
    if (text === "buy now" || onclick.includes("buyNow(")) {
      el.classList.add("buy-now-btn");
    }
  });
}

function initAdminAccessNotifications() {
  if (document.body.dataset.page === "admin") {
    pushAdminNotification("admin_open", "Admin opened the dashboard.");
  }
}

function initPageUtilities() {
  seedStorage();
  recordPageAccess();
  initPageAdminButton();
  initAdminLoginPage();
  initAdminPage();
  buildImageModal();
  enhanceBuyNowButtons();
  initInteractive3DEffects();
  initAdminAccessNotifications();
}

document.addEventListener("DOMContentLoaded", initPageUtilities);
window.addEventListener("load", enhanceBuyNowButtons);

// Expose functions used inline
window.buyNow = buyNow;
window.orderNow = orderNow;
window.addToCart = addToCart;
window.logoutAdmin = logoutAdmin;
window.loadChats = loadChats;
window.loadPendingPayments = loadPendingPayments;
window.loadReviewModeration = loadReviewModeration;
window.loadSecurityReport = loadSecurityReport;
window.loadOperationsPanel = loadOperationsPanel;
window.loadImages = loadImages;
window.loadCompleteReport = loadCompleteReport;
window.confirmPayment = confirmPayment;
window.approveReview = approveReview;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.editChat = editChat;
window.deleteChat = deleteChat;
window.saveAdminOperations = saveAdminOperations;
