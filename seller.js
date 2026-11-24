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
const inventoryReportBody = document.getElementById("inventory-report-body");
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
const inventoryReportTitle = document.getElementById("inventory-report-title");
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
const statSlowestProductLabel = document.getElementById("stat-slowest-product-label");
const statTodayLabel = document.getElementById("stat-today-label");
const statWeekLabel = document.getElementById("stat-week-label");
const statMonthLabel = document.getElementById("stat-month-label");
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
const statSlowestProduct = document.getElementById("stat-slowest-product");
const statTodayRevenue = document.getElementById("stat-today-revenue");
const statWeekRevenue = document.getElementById("stat-week-revenue");
const statMonthRevenue = document.getElementById("stat-month-revenue");
const salesChart = document.getElementById("sales-chart");

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
  inventoryReportTitle.textContent = text("inventoryReport");
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
  statSlowestProductLabel.textContent = text("slowestProduct");
  statTodayLabel.textContent = text("today");
  statWeekLabel.textContent = text("thisWeek");
  statMonthLabel.textContent = text("thisMonth");
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

function createElement(tagName, className, value) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (value !== undefined) {
    element.textContent = String(value);
  }
  return element;
}

function createEmptyStateRow(colSpan, message) {
  const row = createElement("tr");
  const cell = createElement("td", "empty-state", message);
  cell.colSpan = colSpan;
  row.appendChild(cell);
  return row;
}

function createOrderDetail(label, value) {
  const detail = createElement("div");
  detail.append(
    createElement("strong", "", `${label}:`),
    document.createTextNode(` ${String(value)}`)
  );
  return detail;
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
    tableBody.replaceChildren(createEmptyStateRow(6, text("noProducts")));
    return;
  }

  const rows = state.products.map((product) => {
    const isLowStock = Number(product.quantity) <= 5;
    const stockClass = isLowStock ? "low-stock" : "in-stock";
    const stockLabel = isLowStock ? text("statusLowStock") : text("statusInStock");
    const row = createElement("tr");
    const stockCell = createElement("td");
    const stockPill = createElement("span", `stock-pill ${stockClass}`, stockLabel);
    stockCell.appendChild(stockPill);

    if (isLowStock) {
      stockCell.appendChild(createElement("div", "low-stock-note", text("lowStock")));
    }

    const actionGroup = createElement("div", "action-group");
    const editButton = createElement("button", "small-btn edit", text("edit"));
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = String(product.id);
    const deleteButton = createElement("button", "small-btn delete", text("delete"));
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = String(product.id);
    actionGroup.append(editButton, deleteButton);

    const actionCell = createElement("td");
    actionCell.appendChild(actionGroup);
    row.append(
      createElement("td", "", product.name),
      createElement("td", "", product.size),
      createElement("td", "", formatMoney(product.price)),
      createElement("td", "", product.quantity),
      stockCell,
      actionCell
    );
    return row;
  });

  tableBody.replaceChildren(...rows);
}

function renderDashboardSummary() {
  const summary = state.summary || {
    totalProducts: 0,
    lowStockProducts: 0,
    totalOrders: 0,
    confirmedOrders: 0,
    todayConfirmedOrders: 0,
    pendingOrders: 0,
    confirmedRevenue: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    totalVisitors: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    visitorsByDay: [],
    topProduct: null,
    slowestProduct: null,
    salesByDay: [],
    productPerformance: []
  };

  const totalOrdersPlaced = Number(summary.totalOrders || summary.ordersPlaced || 0);
  const totalConfirmedOrders = Number(summary.confirmedOrders || summary.ordersConfirmed || 0);
  const todayConfirmedOrders = Number(summary.todayConfirmedOrders || 0);
  const totalVisitors = Number(summary.totalVisitors || 0);
  const visitedRate = totalVisitors > 0 ? (todayConfirmedOrders / totalVisitors) * 100 : 0;

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
  statSlowestProduct.textContent = summary.slowestProduct && summary.slowestProduct.name ? summary.slowestProduct.name : "-";
  statTodayRevenue.textContent = `$${Number(summary.todayRevenue || 0).toFixed(2)}`;
  statWeekRevenue.textContent = `$${Number(summary.weekRevenue || 0).toFixed(2)}`;
  statMonthRevenue.textContent = `$${Number(summary.monthRevenue || 0).toFixed(2)}`;

  const salesData = Array.isArray(summary.salesByDay) ? summary.salesByDay : [];
  const maxRevenue = salesData.length > 0
    ? Math.max(...salesData.map((entry) => Number(entry.revenue || 0)), 1)
    : 1;

  if (!salesData.length) {
    salesChart.replaceChildren(createElement("div", "empty-state", text("noSalesHistory")));
  } else {
    const chartItems = salesData.map((entry) => {
      const value = Number(entry.revenue || 0);
      const height = Math.max(10, (value / maxRevenue) * 100);
      const date = new Date(`${entry.date}T12:00:00`);
      const chartItem = createElement("div", "sales-chart-item");
      const barWrap = createElement("div", "sales-bar-wrap");
      const bar = createElement("span", "sales-bar");
      bar.style.height = `${height}%`;
      barWrap.appendChild(bar);
      chartItem.append(
        barWrap,
        createElement("small", "", date.toLocaleDateString(undefined, { month: "short", day: "numeric" })),
        createElement("strong", "", `$${value.toFixed(2)}`)
      );
      return chartItem;
    });
    salesChart.replaceChildren(...chartItems);
  }

  const salesHistory = Array.isArray(summary.salesByDay) ? summary.salesByDay : [];
  if (salesHistory.length === 0) {
    salesHistoryList.replaceChildren(createElement("li", "empty-state", text("noSalesHistory")));
  } else {
    const historyItems = salesHistory.map((entry) => {
      const item = createElement("li");
      item.append(
        createElement("span", "", new Date(entry.date).toLocaleDateString()),
        createElement("span", "", `${entry.orderCount} · $${Number(entry.revenue || 0).toFixed(2)}`)
      );
      return item;
    });
    salesHistoryList.replaceChildren(...historyItems);
  }

  const visitorsHistory = Array.isArray(summary.visitorsByDay) ? summary.visitorsByDay : [];
  if (visitorsHistory.length === 0) {
    visitorsHistoryList.replaceChildren(createElement("li", "empty-state", text("noVisitorsHistory")));
  } else {
    const visitorItems = visitorsHistory.map((entry) => {
      const item = createElement("li");
      item.append(
        createElement("span", "", new Date(entry.date).toLocaleDateString()),
        createElement("span", "", `${entry.visitorCount} ${text("visitors")}`)
      );
      return item;
    });
    visitorsHistoryList.replaceChildren(...visitorItems);
  }

  const productRows = Array.isArray(summary.productPerformance) ? summary.productPerformance : [];
  if (!productRows.length) {
    inventoryReportBody.replaceChildren(createEmptyStateRow(5, text("noProducts")));
    return;
  }

  const inventoryRows = productRows.map((product) => {
    const row = createElement("tr");
    row.append(
      createElement("td", "", product.name),
      createElement("td", "", Number(product.startingStock || 0)),
      createElement("td", "", Number(product.quantitySold || 0)),
      createElement("td", "", Number(product.stockLeft || 0)),
      createElement("td", "", `$${Number(product.moneyEarned || 0).toFixed(2)}`)
    );
    return row;
  });
  inventoryReportBody.replaceChildren(...inventoryRows);
}

function renderOrders() {
  if (!state.orders.length) {
    ordersList.replaceChildren(createElement("div", "empty-state", text("noOrders")));
    return;
  }

  const orderCards = state.orders.map((order) => {
    const parsedItems = Array.isArray(order.items) ? order.items : safeParse(order.items);
    const items = Array.isArray(parsedItems) ? parsedItems : [];
    const statusKey = order.status === "confirmed"
      ? "orderStatusConfirmed"
      : order.status === "cancelled"
        ? "orderStatusCancelled"
        : "orderStatusPending";
    const statusClass = order.status === "confirmed" ? "confirmed" : order.status === "cancelled" ? "cancelled" : "pending";
    const card = createElement("article", "order-card");
    const header = createElement("div", "order-header");
    const heading = createElement(
      "h3",
      "order-title",
      `${text("orderCustomer")}: ${order.customer_name || order.customerName || "-"}`
    );
    const status = createElement("span", `status-chip ${statusClass}`, text(statusKey));
    header.append(heading, status);

    const contactDetails = createElement("div", "order-meta");
    contactDetails.append(
      createOrderDetail(text("orderPhone"), order.phone || "-"),
      createOrderDetail(text("orderAddress"), order.address || "-"),
      createOrderDetail(text("orderPayment"), order.payment_method || order.paymentMethod || "-"),
      createOrderDetail(text("orderDate"), new Date(order.created_at).toLocaleString())
    );

    const itemsDetails = createElement("div", "order-meta");
    itemsDetails.appendChild(createElement("strong", "", `${text("orderItems")}:`));
    const itemList = createElement("ul", "order-items");
    if (items.length) {
      items.forEach((item) => {
        const name = item && (item.productName || item.name) || "-";
        const quantity = item && item.quantity !== undefined ? item.quantity : "-";
        itemList.appendChild(createElement("li", "", `${name} × ${quantity}`));
      });
    } else {
      itemList.appendChild(createElement("li", "", "—"));
    }
    itemsDetails.appendChild(itemList);

    const summaryDetails = createElement("div", "order-meta");
    summaryDetails.append(
      createOrderDetail(text("orderNotes"), order.notes || "-"),
      createOrderDetail(text("orderTotal"), formatMoney(order.total || 0))
    );

    const footer = createElement("div", "order-footer");
    if (order.status === "pending") {
      const actions = createElement("div", "order-actions");
      const confirmButton = createElement("button", "confirm-btn", text("orderConfirm"));
      confirmButton.type = "button";
      confirmButton.dataset.orderAction = "confirm";
      confirmButton.dataset.orderId = String(order.id);
      const cancelButton = createElement("button", "cancel-btn", text("orderCancel"));
      cancelButton.type = "button";
      cancelButton.dataset.orderAction = "cancel";
      cancelButton.dataset.orderId = String(order.id);
      actions.append(confirmButton, cancelButton);
      footer.appendChild(actions);
    }

    card.append(header, contactDetails, itemsDetails, summaryDetails, footer);
    return card;
  });
  ordersList.replaceChildren(...orderCards);
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
    tableBody.replaceChildren(createEmptyStateRow(6, error.message));
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
    ordersList.replaceChildren(createElement("div", "empty-state", error.message));
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
  salesHistoryList.replaceChildren(createElement("li", "empty-state", error.message));
}
}

setLanguage("fr");
fetchProducts();
fetchOrders();
fetchDashboardSummary();
