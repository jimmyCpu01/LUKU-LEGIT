console.log("Script.js loaded successfully!");

// ==================== CONSTANTS ====================
const ADMIN_PASSWORD_HASH =
  "ca96c3848839b87f8658ef8b38a13d939eb913b67718faece92a0a7713e3e609";
const ADMIN_SESSION_KEY = "adminLoggedIn";

// ==================== CRYPTO UTILITIES ====================
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ==================== SESSION MANAGEMENT ====================
function isAdminLoggedIn() {
  return localStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function setAdminSession() {
  localStorage.setItem(ADMIN_SESSION_KEY, "true");
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

function logoutAdmin() {
  clearAdminSession();
  window.location.href = "admin-login.html";
}

// ==================== TRACKING ====================
function trackUserInteraction(action, details = {}) {
  const interactions = JSON.parse(
    localStorage.getItem("userInteractions") || "[]",
  );
  interactions.push({
    action,
    details,
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
  });
  localStorage.setItem(
    "userInteractions",
    JSON.stringify(interactions.slice(-100)),
  );
}

function recordUnauthorizedAccess(context, reason) {
  const reports = JSON.parse(
    localStorage.getItem("unauthorizedReports") || "[]",
  );
  reports.push({
    context,
    reason,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });
  localStorage.setItem(
    "unauthorizedReports",
    JSON.stringify(reports.slice(-50)),
  );
}

// ==================== E-COMMERCE FUNCTIONS ====================
function buyNow(name, price, condition) {
  const product = { name, price, condition };
  addToCart(product);
  window.location.href = "cart.html";
}

function addToCart(product) {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  cart.push(product);
  localStorage.setItem("cart", JSON.stringify(cart));
}

// ==================== ADMIN INITIALIZATION ====================
async function promptAdminAccess(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const token = button?.dataset?.adminToken || "";
  const decoded = token ? atob(token) : null;
  if (decoded !== "admin-token") {
    recordUnauthorizedAccess("admin-button", "invalid-token");
    alert("Admin access is restricted.");
    return;
  }
  window.location.href = "admin-login.html";
}

function initPageAdminButton() {
  const adminBtn = document.getElementById("admin-access-btn");
  if (adminBtn) {
    adminBtn.addEventListener("click", promptAdminAccess);
  }
}

async function initAdminLoginPage() {
  if (window.document.body.dataset.page !== "admin-login") return;

  const loginForm = document.getElementById("admin-login-form");
  const errorDisplay = document.getElementById("login-error");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const password = document.getElementById("admin-password").value.trim();
      if (!password) {
        if (errorDisplay)
          errorDisplay.textContent = "Password cannot be empty.";
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
      if (errorDisplay)
        errorDisplay.textContent =
          "Invalid password. This attempt has been reported.";
    });
  }
}

function initAdminPage() {
  if (window.document.body.dataset.page !== "admin") return;

  if (!isAdminLoggedIn()) {
    recordUnauthorizedAccess("direct-admin-page", "page-load");
    window.location.href = "admin-login.html";
    return;
  }

  const adminPanel = document.getElementById("admin-panel");
  const logoutBtn = document.getElementById("logout-btn");
  const tabButtons = document.querySelectorAll(".tab-btn");

  adminPanel.style.display = "block";
  loadOverviewStats();

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
        content.style.opacity = "0";
        content.style.transform = "translateY(20px)";
      });

      this.classList.add("active");
      const targetContent = document.getElementById(tabId);
      if (targetContent) {
        targetContent.classList.add("active");
        setTimeout(() => {
          targetContent.style.opacity = "1";
          targetContent.style.transform = "translateY(0)";
        }, 50);
        loadTabData(tabId);
      }
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      if (confirm("Are you sure you want to logout?")) {
        logoutAdmin();
      }
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
  }
}

// ==================== DATA LOADERS ====================
function seedAdminData() {
  if (!localStorage.getItem("payments")) {
    const samplePayments = [
      {
        id: 1,
        name: "Ladies Running Shoes",
        amount: 4200,
        status: "pending",
        user: "Jane S.",
        timestamp: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Kids Sneakers",
        amount: 1800,
        status: "pending",
        user: "Oscar J.",
        timestamp: new Date().toISOString(),
      },
    ];
    localStorage.setItem("payments", JSON.stringify(samplePayments));
  }
}

async function fetchChatMessagesFromServer() {
  try {
    const response = await fetch("/api/chat-messages");
    if (!response.ok) throw new Error("Network response was not ok");
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Unable to load chat messages from server:", error);
    return JSON.parse(localStorage.getItem("chatMessages") || "[]");
  }
}

async function loadOverviewStats() {
  seedAdminData();
  const payments = JSON.parse(localStorage.getItem("payments") || "[]");
  const interactions = JSON.parse(
    localStorage.getItem("userInteractions") || "[]",
  );
  const reviews = JSON.parse(localStorage.getItem("reviews") || "[]");
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const chats = await fetchChatMessagesFromServer();

  const pendingPayments = payments.filter((p) => p.status === "pending").length;
  const completedPayments = payments.filter(
    (p) => p.status === "completed",
  ).length;

  updateStatWithAnimation("stat-payments", pendingPayments);
  updateStatWithAnimation("stat-completed-payments", completedPayments);
  updateStatWithAnimation("stat-users", interactions.length);
  updateStatWithAnimation("stat-reviews", reviews.length);
  updateStatWithAnimation("stat-cart-items", cart.length);
  updateStatWithAnimation("stat-total-chats", chats.length);
  updateStatWithAnimation("stat-alerts", 0);

  loadActivityLog();
}

function updateStatWithAnimation(elementId, newValue) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = newValue;
  }
}

function loadActivityLog() {
  const logContainer = document.getElementById("activity-log");
  if (!logContainer) return;
  const interactions = JSON.parse(
    localStorage.getItem("userInteractions") || "[]",
  );
  logContainer.innerHTML = "";
  if (!interactions.length) {
    logContainer.innerHTML =
      '<div class="data-item"><p>No tracked interactions yet.</p></div>';
    return;
  }
  interactions
    .slice(-10)
    .reverse()
    .forEach((item) => {
      const div = document.createElement("div");
      div.className = "data-item";
      div.innerHTML = `<p><strong>${item.action}</strong> | ${new Date(item.timestamp).toLocaleString()}</p>`;
      logContainer.appendChild(div);
    });
}

function loadPendingPayments() {
  const container = document.getElementById("payments-list");
  const alertBanner = document.getElementById("payment-alert-banner");
  if (!container) return;

  if (alertBanner) {
    const notifications = JSON.parse(
      localStorage.getItem("paymentNotifications") || "[]",
    );
    if (notifications.length) {
      const latest = notifications[notifications.length - 1];
      alertBanner.innerHTML = `<p style="margin:0; font-weight:700;">${notifications.length} new payment page visit(s)</p><p style="margin:0.5rem 0 0 0;">Latest visit: ${new Date(latest.timestamp).toLocaleString()} for <strong>${latest.product}</strong>.</p>`;
    } else {
      alertBanner.innerHTML = `<p style="margin:0; color: var(--text-dim);">No new payment page visits since last refresh.</p>`;
    }
  }

  const payments = JSON.parse(localStorage.getItem("payments") || "[]");
  container.innerHTML = "";
  payments.forEach((payment, index) => {
    const div = document.createElement("div");
    div.className = "data-item";
    div.innerHTML = `
      <h4>${payment.product || payment.name}</h4>
      <p><strong>User:</strong> ${payment.name || payment.user || "Guest"}</p>
      <p><strong>Size:</strong> ${payment.size || "N/A"}</p>
      <p><strong>Email:</strong> ${payment.email || "N/A"}</p>
      <p><strong>Phone:</strong> ${payment.phone || "N/A"}</p>
      <p><strong>Amount:</strong> Ksh ${payment.amount}</p>
      <p><strong>Status:</strong> ${payment.status.toUpperCase()}</p>
      <p><strong>Date:</strong> ${new Date(payment.timestamp).toLocaleString()}</p>
      ${payment.proofImage ? `<p><strong>Payment Proof:</strong></p><img src="${payment.proofImage}" alt="Payment proof" style="max-width:100%; max-height:260px; border-radius: 12px; margin: 0.75rem 0;" />` : ""}
      ${payment.status === "pending" ? `<button class="btn btn-small" onclick="confirmPayment(${index})">Confirm Payment</button>` : ""}
    `;
    container.appendChild(div);
  });
}

function confirmPayment(index) {
  const payments = JSON.parse(localStorage.getItem("payments") || "[]");
  if (payments[index]) {
    payments[index].status = "completed";
    localStorage.setItem("payments", JSON.stringify(payments));
    loadPendingPayments();
    alert("Payment confirmed.");
  }
}

function loadUserReport() {
  const container = document.getElementById("users-list");
  if (!container) return;
  const interactions = JSON.parse(
    localStorage.getItem("userInteractions") || "[]",
  );
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
      div.innerHTML = `<p><strong>${item.action}</strong> | ${new Date(item.timestamp).toLocaleString()}</p>`;
      container.appendChild(div);
    });
}

function loadReviewModeration() {
  const container = document.getElementById("reviews-list");
  if (!container) return;
  const reviews = JSON.parse(localStorage.getItem("reviews") || "[]");
  container.innerHTML = "";
  if (!reviews.length) {
    container.innerHTML =
      '<div class="data-item"><p>No reviews to moderate.</p></div>';
    return;
  }
  reviews
    .slice(-10)
    .reverse()
    .forEach((review, idx) => {
      const div = document.createElement("div");
      div.className = "data-item";
      div.innerHTML = `
      <p><strong>${review.name}</strong> - ${review.rating}★</p>
      <p>${review.text}</p>
      ${!review.approved ? `<button class="btn btn-small" onclick="approveReview(${idx})">Approve</button>` : '<p style="color: green;">Approved</p>'}
    `;
      container.appendChild(div);
    });
}

function approveReview(index) {
  const reviews = JSON.parse(localStorage.getItem("reviews") || "[]");
  if (reviews[index]) {
    reviews[index].approved = true;
    localStorage.setItem("reviews", JSON.stringify(reviews));
    loadReviewModeration();
  }
}

function loadSecurityReport() {
  const container = document.getElementById("security-list");
  if (!container) return;
  const reports = JSON.parse(
    localStorage.getItem("unauthorizedReports") || "[]",
  );
  container.innerHTML = "";
  if (!reports.length) {
    container.innerHTML =
      '<div class="data-item"><p>No security alerts.</p></div>';
    return;
  }
  reports
    .slice(-20)
    .reverse()
    .forEach((report) => {
      const div = document.createElement("div");
      div.className = "data-item";
      div.innerHTML = `<p><strong>${report.reason}</strong> - ${report.context} | ${new Date(report.timestamp).toLocaleString()}</p>`;
      container.appendChild(div);
    });
}

function loadOperationsPanel() {
  const container = document.getElementById("operations-panel");
  if (!container) return;
  const operations = JSON.parse(
    localStorage.getItem("adminOperations") || "{}",
  );
  container.innerHTML = `
    <form id="operations-form">
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
    maintenanceMode: document.getElementById("maintenance-mode").value,
    autoApproveReviews: document.getElementById("auto-approve-reviews").value,
    orderConfirmation: document.getElementById("order-confirmation").value,
    adminNote: document.getElementById("admin-note").value,
  };
  localStorage.setItem("adminOperations", JSON.stringify(operations));
  trackUserInteraction("admin_operations_saved", operations);
  alert("Admin operations saved.");
}

async function loadChats() {
  const container = document.getElementById("chats-list");
  if (!container) return;
  const chats = await fetchChatMessagesFromServer();
  container.innerHTML = "";
  if (!chats.length) {
    container.innerHTML =
      '<div class="data-item"><p>No chat messages.</p></div>';
    return;
  }
  chats
    .slice(-20)
    .reverse()
    .forEach((chat) => {
      const div = document.createElement("div");
      div.className = "data-item";
      let html = `<p><strong>${chat.sender}</strong></p>`;
      if (chat.tel) html += `<p><strong>Phone:</strong> ${chat.tel}</p>`;
      if (chat.email) html += `<p><strong>Email:</strong> ${chat.email}</p>`;
      html += `<p>${chat.content}</p>`;
      if (chat.image) {
        html += `<img src="${chat.image}" alt="Attached image" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 0.5rem;">`;
      }
      html += `<small>${new Date(chat.timestamp).toLocaleString()}</small>`;
      div.innerHTML = html;
      container.appendChild(div);
    });
}

function loadImages() {
  const container = document.getElementById("images-list");
  if (!container) return;
  const images = JSON.parse(localStorage.getItem("uploadedImages") || "[]");
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
      div.innerHTML = `<p>Uploaded: ${new Date(image.timestamp).toLocaleString()}</p>`;
      container.appendChild(div);
    });
}

function loadCompleteReport() {
  const container = document.getElementById("report-container");
  if (!container) return;
  const payments = JSON.parse(localStorage.getItem("payments") || "[]");
  const interactions = JSON.parse(
    localStorage.getItem("userInteractions") || "[]",
  );
  const reviews = JSON.parse(localStorage.getItem("reviews") || "[]");

  container.innerHTML = `
    <h4>Total Payments: ${payments.length}</h4>
    <p>Pending: ${payments.filter((p) => p.status === "pending").length}</p>
    <p>Completed: ${payments.filter((p) => p.status === "completed").length}</p>
    <hr>
    <h4>Total Interactions: ${interactions.length}</h4>
    <hr>
    <h4>Total Reviews: ${reviews.length}</h4>
  `;
}

// ==================== PAGE INITIALIZATION ====================
window.addEventListener("DOMContentLoaded", function () {
  initAdminPage();
  initAdminLoginPage();
  initPageAdminButton();
  initImageModal();
  initInteractive3DEffects();
});

function initInteractive3DEffects() {
  const cards = document.querySelectorAll(
    ".shoe-card, .panel-card, .contact-card, .data-item, .recommendation-item",
  );
  cards.forEach((card) => {
    card.addEventListener("pointermove", function (event) {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      const rotateX = (y / rect.height) * 10;
      const rotateY = (x / rect.width) * -10;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
    });
    card.addEventListener("pointerleave", function () {
      card.style.transform = "";
    });
  });
}

// ==================== IMAGE MODAL FUNCTIONALITY ====================
function initImageModal() {
  function getSizeOptions() {
    const page = document.body.dataset.page || "";
    const isKidsPage = page === "kids";
    const start = isKidsPage ? 19 : 36;
    const end = isKidsPage ? 35 : 45;
    let options =
      '<option value="" selected disabled>Select your EUR size</option>';
    for (let size = start; size <= end; size += 1) {
      options += `<option value="EUR ${size}">EUR ${size}</option>`;
    }
    return options;
  }

  // Create modal HTML structure
  const modalHTML = `
    <div id="imageModal" class="modal">
      <span class="close">&times;</span>
      <div class="modal-content-grid">
        <img class="modal-image" id="modalImage">
        <div class="modal-buttons">
          <button class="btn" id="addToCartBtn">Add to Cart</button>
          <button class="btn btn-secondary" id="orderNowBtn">Order Now</button>
          <button class="btn btn-primary" id="moreLikeBtn">More Like These</button>
        </div>
      </div>
      <div class="modal-size">
        <label for="sizeSelect">Select Size (EUR):</label>
        <select id="sizeSelect">
          ${getSizeOptions()}
        </select>
        <div class="size-help">
          <p>Need help finding your perfect fit? Start a quick size chat before choosing.</p>
          <button type="button" class="btn btn-secondary" id="sizeHelpBtn">Shoe Size Chat</button>
        </div>
      </div>
    </div>
  `;

  const moreLikeModalHTML = `
    <div id="moreLikeModal" class="modal more-like-modal">
      <div class="more-like-card">
        <div class="more-like-header">
          <div>
            <span class="label">Premium Match</span>
            <h2>More like <span id="moreLikeTitle">These</span></h2>
            <p id="moreLikeDescription">Explore premium matches, preview top styles, or message us instantly.</p>
          </div>
          <button class="more-like-close" id="moreLikeClose">&times;</button>
        </div>
        <div class="recommendation-list" id="recommendationList"></div>
        <div class="dialog-actions">
          <button class="btn btn-primary" id="whatsappMoreBtn">Send catalogue on WhatsApp</button>
          <button class="btn btn-secondary" id="googleMoreBtn">Search similar images</button>
          <button class="btn" id="backToProductBtn">Back to product</button>
        </div>
      </div>
    </div>
  `;

  // Add modals to body
  document.body.insertAdjacentHTML("beforeend", modalHTML + moreLikeModalHTML);

  // Get modal elements
  const modal = document.getElementById("imageModal");
  const moreLikeModal = document.getElementById("moreLikeModal");
  const modalImg = document.getElementById("modalImage");
  const closeBtn = document.getElementsByClassName("close")[0];
  const moreLikeClose = document.getElementById("moreLikeClose");
  const addToCartBtn = document.getElementById("addToCartBtn");
  const orderNowBtn = document.getElementById("orderNowBtn");
  const moreLikeBtn = document.getElementById("moreLikeBtn");
  const whatsappMoreBtn = document.getElementById("whatsappMoreBtn");
  const googleMoreBtn = document.getElementById("googleMoreBtn");
  const backToProductBtn = document.getElementById("backToProductBtn");
  const moreLikeTitle = document.getElementById("moreLikeTitle");
  const moreLikeDescription = document.getElementById("moreLikeDescription");
  const recommendationList = document.getElementById("recommendationList");
  const sizeSelect = document.getElementById("sizeSelect");

  function getRecommendations(currentName) {
    const allImages = Array.from(document.querySelectorAll(".shoe-card img"));
    return allImages
      .filter((img) => img.alt && img.alt !== currentName)
      .slice(0, 4)
      .map((img) => {
        const card = img.closest(".shoe-card");
        const label =
          card?.querySelector("h3")?.textContent?.trim() ||
          img.alt ||
          "Similar product";
        return {
          name: img.alt,
          label,
          src: img.src,
        };
      });
  }

  function updateMoreLikeDialog(productName) {
    const safeName = productName || "this style";
    const suggestions = getRecommendations(productName);
    moreLikeTitle.textContent = safeName;
    moreLikeDescription.textContent = `Tap a curated match below, then choose WhatsApp or Google to connect instantly.`;
    whatsappMoreBtn.dataset.query = encodeURIComponent(`${safeName} shoes`);
    googleMoreBtn.dataset.query = encodeURIComponent(`${safeName} shoes`);
    recommendationList.innerHTML = suggestions
      .map(
        (item, index) => `
          <button class="recommendation-item" type="button" data-query="${encodeURIComponent(
            item.label,
          )}">
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
          const query = this.dataset.query;
          const label = this.querySelector("strong")?.textContent || safeName;
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

  // Add click event to all shoe images (excluding ladies/kids section on index.html)
  const shoeImages = document.querySelectorAll(".shoe-card img");
  shoeImages.forEach((img) => {
    // Skip images in the ladies/kids two-grid section on index.html
    const isInTwoGridOnIndex =
      window.location.pathname.includes("index.html") &&
      img.closest(".product-grid.two-grid");

    if (!isInTwoGridOnIndex) {
      img.style.cursor = "pointer";
      img.addEventListener("click", function () {
        modal.style.display = "block";
        modalImg.src = this.src;
        modalImg.alt = this.alt;

        if (sizeSelect) {
          sizeSelect.selectedIndex = 0;
        }

        // Store current image info for buttons
        const card = this.closest(".shoe-card");
        const priceText = card.querySelector(".price")?.textContent || "";
        const price = parseInt(priceText.replace(/[^\d]/g, "")) || 0;
        const condition = card.querySelector(".shoe-specs")?.textContent || "";

        modalImg.dataset.productName = this.alt || "Product";
        modalImg.dataset.productSrc = this.src;
        modalImg.dataset.productPrice = price;
        modalImg.dataset.productCondition = condition;
      });
    }
  });

  // Close modal when clicking X
  closeBtn.onclick = function () {
    modal.style.display = "none";
  };

  // Close modal when clicking outside
  modal.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Button actions
  addToCartBtn.onclick = function () {
    const selectedSize = sizeSelect ? sizeSelect.value : "";
    if (!selectedSize) {
      alert("Please select a size before adding to cart.");
      return;
    }

    const product = {
      name: modalImg.dataset.productName,
      image: modalImg.dataset.productSrc,
      price: parseInt(modalImg.dataset.productPrice) || 0,
      size: selectedSize,
      condition: modalImg.dataset.productCondition,
    };

    addToCart(product);
    alert("Added to cart!");
    modal.style.display = "none";
  };

  orderNowBtn.onclick = function () {
    const selectedSize = sizeSelect ? sizeSelect.value : "";
    if (!selectedSize) {
      alert("Please select a size before ordering.");
      return;
    }

    const selectedProduct = {
      name: modalImg.dataset.productName,
      image: modalImg.dataset.productSrc,
      price: "Contact for pricing",
      size: selectedSize,
    };
    localStorage.setItem("selectedProduct", JSON.stringify(selectedProduct));
    window.location.href = "order.html";
  };

  moreLikeBtn.onclick = function () {
    const productName = modalImg.dataset.productName || "this style";
    updateMoreLikeDialog(productName);
    modal.style.display = "none";
    moreLikeModal.style.display = "flex";
  };

  whatsappMoreBtn.onclick = function () {
    const query = whatsappMoreBtn.dataset.query || encodeURIComponent("shoes");
    const whatsappUrl = `https://wa.me/254700408174?text=Hi, I would like to view your catalogue for ${decodeURIComponent(query)}.`;
    window.open(whatsappUrl, "_blank");
  };

  const sizeHelpBtn = document.getElementById("sizeHelpBtn");
  if (sizeHelpBtn) {
    sizeHelpBtn.onclick = function () {
      window.location.href = "chat.html#size-help";
    };
  }

  googleMoreBtn.onclick = function () {
    const query = googleMoreBtn.dataset.query || encodeURIComponent("shoes");
    const googleUrl = `https://www.google.com/search?q=${query}&tbm=isch`;
    window.open(googleUrl, "_blank");
  };

  backToProductBtn.onclick = function () {
    moreLikeModal.style.display = "none";
    modal.style.display = "block";
  };

  moreLikeClose.onclick = function () {
    moreLikeModal.style.display = "none";
  };
}
