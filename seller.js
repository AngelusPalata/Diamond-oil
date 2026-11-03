const state = {
  currentLanguage: "fr",
  editingProductId: null,
  products: [],
  orders: [],
  summary: null
};

const formElement = document.getElementById("product-form");
const formMessage = document.getElementById("form-message");
const tableBody = document.getElementById("products-table-body");
const ordersList = document.getElementById("orders-list");
const salesHistoryList = document.getElementById("sales-history-list");
const visitorsHistoryList = document.getElementById("visitors-history-list");
const submitButton = document.getElementById("submit-btn");
const logoutButton = document.getElementById("logout-btn");
const cancelEditButton = document.getElementById("cancel-edit-btn");
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");
const productFormTitle = document.getElementById("product-form-title");
const productsTableTitle = document.getElementById("products-table-title");
const ordersTitle = document.getElementById("orders-title");
const statsTitle = document.getElementById("stats-title");
const salesHistoryTitle = document.getElementById("sales-history-title");
const visitorsHistoryTitle = document.getElementById("visitors-history-title");
const statProductsLabel = document.getElementById("stat-products-label");
const statLowStockLabel = document.getElementById("stat-low-stock-label");
const statOrdersLabel = document.getElementById("stat-orders-label");
const statRevenueLabel = document.getElementById("stat-revenue-label");
const statPendingLabel = document.getElementById("stat-pending-label");
const statVisitorsLabel = document.getElementById("stat-visitors-label");
const statConfirmedLabel = document.getElementById("stat-confirmed-label");
const statAverageOrderLabel = document.getElementById("stat-average-order-label");
const statConversionLabel = document.getElementById("stat-conversion-label");
const statTopProductLabel = document.getElementById("stat-top-product-label");
const productNameField = document.getElementById("product-name");
const productSizeField = document.getElementById("product-size");
const productPriceField = document.getElementById("product-price");
const productQuantityField = document.getElementById("product-quantity");
const statProducts = document.getElementById("stat-products");
const statLowStock = document.getElementById("stat-low-stock");
const statOrders = document.getElementById("stat-orders");
const statRevenue = document.getElementById("stat-revenue");
const statPending = document.getElementById("stat-pending");
const statVisitors = document.getElementById("stat-visitors");
const statConfirmedOrders = document.getElementById("stat-confirmed-orders");
const statAverageOrder = document.getElementById("stat-average-order");
const statConversionRate = document.getElementById("stat-conversion-rate");
const statTopProduct = document.getElementById("stat-top-product");

const translationMap = window.dashboardTranslations || {};

function text(key) {
  const map = translationMap[state.currentLanguage] || translationMap.fr;
  return map[key] || key;
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : [];
  } catch (error) {
    return [];
  }
}

function setLanguage(lang) {
  state.currentLanguage = lang;

  document.documentElement.lang = lang;
  document.getElementById("lang-fr").classList.toggle("active", lang === "fr");
  document.getElementById("lang-en").classList.toggle("active", lang === "en");

  pageTitle.textContent = text("pageTitle");
  pageSubtitle.textContent = text("pageSubtitle");
  productFormTitle.textContent = state.editingProductId ? text("editProduct") : text("addProduct");
  productsTableTitle.textContent = text("productsTitle");
  ordersTitle.textContent = text("ordersTitle");
  statsTitle.textContent = text("statsTitle");
  salesHistoryTitle.textContent = text("salesHistory");
  visitorsHistoryTitle.textContent = text("visitorsByDay");
  statProductsLabel.textContent = text("totalProducts");
  statLowStockLabel.textContent = text("lowStockProducts");
  statOrdersLabel.textContent = text("ordersPlaced");
  statRevenueLabel.textContent = text("confirmedRevenue");
  statPendingLabel.textContent = text("pendingOrders");
  statVisitorsLabel.textContent = text("visitors");
  statConfirmedLabel.textContent = text("ordersConfirmed");
  statAverageOrderLabel.textContent = text("averageOrderValue");
  statConversionLabel.textContent = text("conversionRate");
  statTopProductLabel.textContent = text("topProduct");
  submitButton.textContent = state.editingProductId ? text("updateProduct") : text("saveProduct");
  cancelEditButton.textContent = text("cancelEdit");
  cancelEditButton.classList.toggle("hidden", !state.editingProductId);

  document.querySelector('label[for="product-name"]').textContent = text("productName");
  document.querySelector('label[for="product-size"]').textContent = text("productSize");
  document.querySelector('label[for="product-price"]').textContent = text("productPrice");
  document.querySelector('label[for="product-quantity"]').textContent = text("productQuantity");

  renderProducts();
  renderOrders();
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? "#ffb1b1" : "#f6d77a";
}

function formatMoney(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function resetForm() {
  formElement.reset();
  state.editingProductId = null;
  productNameField.focus();
  productFormTitle.textContent = text("addProduct");
  submitButton.textContent = text("saveProduct");
  cancelEditButton.classList.add("hidden");
}

function renderProducts() {
  if (!state.products.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">${text("noProducts")}</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = state.products
    .map((product) => {
      const isLowStock = Number(product.quantity) <= 5;
      const stockClass = isLowStock ? "low-stock" : "in-stock";
      const stockLabel = isLowStock ? text("statusLowStock") : text("statusInStock");

      return `
        <tr>
          <td>${product.name}</td>
          <td>${product.size}</td>
          <td>${formatMoney(product.price)}</td>
          <td>${product.quantity}</td>
          <td>
            <span class="stock-pill ${stockClass}">${stockLabel}</span>
            ${isLowStock ? `<div style="margin-top: 8px; color: #ffb1b1; font-size: 0.8rem;">${text("lowStock")}</div>` : ""}
          </td>
          <td>
            <div class="action-group">
              <button type="button" class="small-btn edit" data-action="edit" data-id="${product.id}">${text("edit")}</button>
              <button type="button" class="small-btn delete" data-action="delete" data-id="${product.id}">${text("delete")}</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderDashboardSummary() {
  const summary = state.summary || {
    totalProducts: 0,
    lowStockProducts: 0,
    totalOrders: 0,
    confirmedOrders: 0,
    pendingOrders: 0,
    confirmedRevenue: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    totalVisitors: 0,
    visitorsByDay: [],
    topProduct: null,
    salesByDay: []
  };

  const totalOrdersPlaced = Number(summary.totalOrders || summary.ordersPlaced || 0);
  const totalConfirmedOrders = Number(summary.confirmedOrders || summary.ordersConfirmed || 0);
  const totalVisitors = Number(summary.totalVisitors || 0);
  const visitedRate = totalVisitors > 0 ? (totalConfirmedOrders / totalVisitors) * 100 : 0;

  statProducts.textContent = String(summary.totalProducts || 0);
  statLowStock.textContent = String(summary.lowStockProducts || 0);
  statOrders.textContent = String(totalOrdersPlaced);
  statRevenue.textContent = `$${Number(summary.confirmedRevenue || 0).toFixed(2)}`;
  statPending.textContent = String(summary.pendingOrders || 0);
  statVisitors.textContent = String(totalVisitors);
  statConfirmedOrders.textContent = String(totalConfirmedOrders);
  statAverageOrder.textContent = `$${Number(summary.averageOrderValue || 0).toFixed(2)}`;
  statConversionRate.textContent = `${visitedRate.toFixed(1)}%`;
  statTopProduct.textContent = summary.topProduct && summary.topProduct.name ? summary.topProduct.name : "-";

  if (!summary.salesByDay || summary.salesByDay.length === 0) {
    salesHistoryList.innerHTML = `<li class="empty-state">${text("noSalesHistory")}</li>`;
  } else {
    salesHistoryList.innerHTML = summary.salesByDay
      .map((entry) => `
        <li>
          <span>${new Date(entry.date).toLocaleDateString()}</span>
          <span>${entry.orderCount} · $${Number(entry.revenue || 0).toFixed(2)}</span>
        </li>
      `)
      .join("");
  }

  if (!summary.visitorsByDay || summary.visitorsByDay.length === 0) {
    visitorsHistoryList.innerHTML = `<li class="empty-state">${text("noVisitorsHistory")}</li>`;
  } else {
    visitorsHistoryList.innerHTML = summary.visitorsByDay
      .map((entry) => `
        <li>
          <span>${new Date(entry.date).toLocaleDateString()}</span>
          <span>${entry.visitorCount} ${text("visitors")}</span>
        </li>
      `)
      .join("");
  }
}

function renderOrders() {
  if (!state.orders.length) {
    ordersList.innerHTML = `<div class="empty-state">${text("noOrders")}</div>`;
    return;
  }

  ordersList.innerHTML = state.orders
    .map((order) => {
      const items = Array.isArray(order.items) ? order.items : safeParse(order.items);
      const statusKey = order.status === "confirmed"
        ? "orderStatusConfirmed"
        : order.status === "cancelled"
          ? "orderStatusCancelled"
          : "orderStatusPending";
      const statusClass = order.status === "confirmed" ? "confirmed" : order.status === "cancelled" ? "cancelled" : "pending";
      const itemList = items.length
        ? items.map((item) => `<li>${item.productName || item.name} × ${item.quantity}</li>`).join("")
        : "<li>—</li>";

      const actionButtons = order.status === "pending"
        ? `
          <div class="order-actions">
            <button type="button" class="confirm-btn" data-order-action="confirm" data-order-id="${order.id}">${text("orderConfirm")}</button>
            <button type="button" class="cancel-btn" data-order-action="cancel" data-order-id="${order.id}">${text("orderCancel")}</button>
          </div>
        `
        : "";

      return `
        <article class="order-card">
          <div class="order-header">
            <h3 class="order-title">${text("orderCustomer")}: ${order.customer_name || order.customerName || "-"}</h3>
            <span class="status-chip ${statusClass}">${text(statusKey)}</span>
          </div>

          <div class="order-meta">
            <div><strong>${text("orderPhone")}:</strong> ${order.phone || "-"}</div>
            <div><strong>${text("orderAddress")}:</strong> ${order.address || "-"}</div>
            <div><strong>${text("orderPayment")}:</strong> ${order.payment_method || order.paymentMethod || "-"}</div>
            <div><strong>${text("orderDate")}:</strong> ${new Date(order.created_at).toLocaleString()}</div>
          </div>

          <div class="order-meta">
            <strong>${text("orderItems")}:</strong>
            <ul class="order-items">${itemList}</ul>
          </div>

          <div class="order-meta">
            <div><strong>${text("orderNotes")}:</strong> ${order.notes || "-"}</div>
            <div><strong>${text("orderTotal")}:</strong> ${formatMoney(order.total || 0)}</div>
          </div>

          <div class="order-footer">
            ${actionButtons}
          </div>
        </article>
      `;
    })
    .join("");
}

async function fetchProducts() {
  try {
    const response = await fetch("/api/products");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load products.");
    }

    state.products = data.products || [];
    renderProducts();
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">${error.message}</td>
      </tr>
    `;
  }
}

async function fetchOrders() {
  try {
    const response = await fetch("/api/orders");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load orders.");
    }

    const orders = Array.isArray(data.orders) ? data.orders : [];
    state.orders = orders.map((order) => ({
      ...order,
      items: safeParse(order.items)
    }));
    renderOrders();
  } catch (error) {
    ordersList.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

async function updateOrderStatus(orderId, action) {
  try {
    const response = await fetch(`/api/orders/${orderId}/${action}`, { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to update order.");
    }

    showMessage(action === "confirm" ? text("successOrderConfirmed") : text("successOrderCancelled"));
    await fetchOrders();
  } catch (error) {
    showMessage(error.message || "Unable to update order.", true);
  }
}

function fillProductForm(product) {
  state.editingProductId = product.id;
  productNameField.value = product.name;
  productSizeField.value = product.size;
  productPriceField.value = product.price;
  productQuantityField.value = product.quantity;
  productFormTitle.textContent = text("editProduct");
  submitButton.textContent = text("updateProduct");
  cancelEditButton.classList.remove("hidden");
  productNameField.focus();
}

async function saveProduct(event) {
  event.preventDefault();

  const payload = {
    name: productNameField.value.trim(),
    size: productSizeField.value.trim(),
    price: Number(productPriceField.value),
    quantity: Number(productQuantityField.value)
  };

  if (!payload.name || !payload.size) {
    showMessage(text("errorSaving"), true);
    return;
  }

  if (!Number.isFinite(payload.price) || payload.price < 0) {
    showMessage(text("errorSaving"), true);
    return;
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity < 0) {
    showMessage(text("errorSaving"), true);
    return;
  }

  try {
    const url = state.editingProductId ? `/api/products/${state.editingProductId}` : "/api/products";
    const method = state.editingProductId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || text("errorSaving"));
    }

    showMessage(state.editingProductId ? text("successUpdated") : text("successSaving"));
    resetForm();
    await fetchProducts();
  } catch (error) {
    showMessage(error.message || text("errorSaving"), true);
  }
}

async function deleteProduct(productId) {
  const confirmed = window.confirm(text("confirmDelete"));
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || text("errorSaving"));
    }

    showMessage(text("successDeleted"));
    if (state.editingProductId === productId) {
      resetForm();
    }
    await fetchProducts();
  } catch (error) {
    showMessage(error.message || text("errorSaving"), true);
  }
}

formElement.addEventListener("submit", saveProduct);

logoutButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/logout", { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error("Unable to log out.");
    }
    window.location.href = data.redirect || "/login";
  } catch (error) {
    showMessage(error.message || "Unable to log out.", true);
  }
});

cancelEditButton.addEventListener("click", () => {
  resetForm();
  showMessage("");
});

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.lang);
  });
});

tableBody.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-action]");
  if (!target) {
    return;
  }

  const productId = Number(target.dataset.id);
  const action = target.dataset.action;
  const selectedProduct = state.products.find((product) => product.id === productId);

  if (!selectedProduct) {
    return;
  }

  if (action === "edit") {
    fillProductForm(selectedProduct);
  }

  if (action === "delete") {
    deleteProduct(productId);
  }
});

ordersList.addEventListener("click", (event) => {
const target = event.target.closest("button[data-order-action]");
if (!target) {
  return;
}

const orderId = Number(target.dataset.orderId);
const action = target.dataset.orderAction;
if (!Number.isInteger(orderId) || orderId <= 0) {
  return;
}

updateOrderStatus(orderId, action);
});

async function fetchDashboardSummary() {
try {
  const response = await fetch("/api/dashboard/summary");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to load dashboard summary.");
  }

  state.summary = data.summary || null;
  renderDashboardSummary();
} catch (error) {
  salesHistoryList.innerHTML = `<li class="empty-state">${error.message}</li>`;
}
}

setLanguage("fr");
fetchProducts();
fetchOrders();
fetchDashboardSummary();
