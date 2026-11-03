const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const session = require("express-session");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const dbFolder = path.join(__dirname, "data");
const dbPath = path.join(dbFolder, "diamond_oil.db");
const SELLER_USERNAME = process.env.SELLER_USERNAME || "seller";
const SELLER_PASSWORD = process.env.SELLER_PASSWORD || "tempPassword123";

if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error("Database connection failed:", error.message);
    return;
  }
  console.log("Connected to SQLite database.");
});

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

async function initDatabase() {
  // Create the products table when the server starts for the first time.
  await runSql(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      size TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      quantity INTEGER NOT NULL CHECK(quantity >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS sellers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      total_price REAL NOT NULL CHECK(total_price >= 0),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(visitor_id, visit_date)
    )
  `);

  const count = await getSql("SELECT COUNT(*) AS total FROM products");
  if (count[0].total === 0) {
    const starterProducts = [
      ["AZZARO The Most Wanted", "30 ml", 35, 10],
      ["Diamond Signature", "50 ml", 42, 5],
      ["Golden Night", "30 ml", 30, 3]
    ];

    for (const product of starterProducts) {
      await runSql(
        "INSERT INTO products (name, size, price, quantity) VALUES (?, ?, ?, ?)",
        product
      );
    }
  }

  const sellerRows = await getSql("SELECT * FROM sellers ORDER BY id ASC");
  const existingSeller = sellerRows[0] || null;

  if (!existingSeller) {
    const hashedPassword = await bcrypt.hash(SELLER_PASSWORD, 10);
    await runSql(
      "INSERT INTO sellers (username, password_hash, must_change_password) VALUES (?, ?, 1)",
      [SELLER_USERNAME, hashedPassword]
    );
    console.log("First seller account created from the .env settings.");
    return;
  }

  const usernameMatches = existingSeller.username === SELLER_USERNAME;
  const passwordMatches = await bcrypt.compare(SELLER_PASSWORD, existingSeller.password_hash);

  if (!usernameMatches || !passwordMatches) {
    const hashedPassword = await bcrypt.hash(SELLER_PASSWORD, 10);
    await runSql("DELETE FROM sellers");
    await runSql(
      "INSERT INTO sellers (username, password_hash, must_change_password) VALUES (?, ?, 1)",
      [SELLER_USERNAME, hashedPassword]
    );
    console.log("Seller account reset from the current .env values.");
  }
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "diamond-oil-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function parseCookies(cookieHeader) {
  const cookieValues = {};

  for (const entry of String(cookieHeader || "").split(";")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      cookieValues[trimmed] = "";
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    cookieValues[key] = decodeURIComponent(value);
  }

  return cookieValues;
}

function requireSellerLogin(req, res, next) {
  if (req.session && req.session.sellerId) {
    return next();
  }

  return res.redirect("/login");
}

function requirePasswordChange(req, res, next) {
  if (req.session && req.session.mustChangePassword) {
    return res.redirect("/change-password");
  }

  return next();
}

app.use(express.static(__dirname));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Diamond Oil backend is running." });
});

app.get("/api/track-visitor", async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    let visitorId = String(cookies["diamond_oil_visitor"] || req.query.visitorId || "").trim();

    if (!visitorId) {
      visitorId = crypto.randomBytes(16).toString("hex");
    }

    const visitDate = new Date().toISOString().slice(0, 10);
    const existingVisitor = await getSql(
      "SELECT id FROM visitors WHERE visitor_id = ? AND visit_date = ?",
      [visitorId, visitDate]
    );

    if (existingVisitor.length === 0) {
      await runSql("INSERT INTO visitors (visitor_id, visit_date) VALUES (?, ?)", [visitorId, visitDate]);
    }

    res.cookie("diamond_oil_visitor", visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });

    res.json({ success: true, visitorId, isNewVisit: existingVisitor.length === 0, visitDate });
  } catch (error) {
    console.error("Visitor tracking failed:", error);
    res.status(500).json({ error: "Unable to track visitor." });
  }
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.post("/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const sellerRows = await getSql("SELECT * FROM sellers WHERE username = ?", [username]);
    if (sellerRows.length === 0) {
      return res.status(401).json({ error: "Invalid login details." });
    }

    const seller = sellerRows[0];
    const isValidPassword = await bcrypt.compare(password, seller.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid login details." });
    }

    req.session.sellerId = seller.id;
    req.session.mustChangePassword = Boolean(seller.must_change_password);

    if (seller.must_change_password) {
      return res.json({ redirect: "/change-password" });
    }

    return res.json({ redirect: "/seller" });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ error: "Unable to log in." });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, redirect: "/login" });
  });
});

app.get("/change-password", requireSellerLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "change-password.html"));
});

app.post("/change-password", requireSellerLogin, async (req, res) => {
  const newPassword = String(req.body.newPassword || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "The new password must be at least 6 characters long." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  try {
    const sellerId = req.session.sellerId;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await runSql(
      "UPDATE sellers SET password_hash = ?, must_change_password = 0 WHERE id = ?",
      [hashedPassword, sellerId]
    );

    req.session.mustChangePassword = false;
    return res.json({ success: true, redirect: "/seller" });
  } catch (error) {
    console.error("Password update failed:", error);
    return res.status(500).json({ error: "Unable to change the password." });
  }
});

app.get("/api/products", requireSellerLogin, async (req, res) => {
  try {
    const products = await getSql(
      "SELECT id, name, size, price, quantity FROM products ORDER BY id DESC"
    );

    const formattedProducts = products.map((product) => ({
      ...product,
      lowStock: product.quantity <= 5,
      stockStatus: product.quantity <= 5 ? "low-stock" : "in-stock"
    }));

    res.json({ products: formattedProducts });
  } catch (error) {
    console.error("Failed to read products:", error);
    res.status(500).json({ error: "Unable to fetch products." });
  }
});

app.get("/api/store/products", async (req, res) => {
  try {
    const products = await getSql(
      "SELECT id, name, size, price, quantity FROM products WHERE quantity > 0 ORDER BY id DESC"
    );
    res.json({ products });
  } catch (error) {
    console.error("Failed to fetch storefront products:", error);
    res.status(500).json({ error: "Unable to fetch storefront products." });
  }
});

app.post("/api/orders/:id/confirm", requireSellerLogin, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "Invalid order id." });
  }

  try {
    const orderRows = await getSql("SELECT status FROM orders WHERE id = ?", [orderId]);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (orderRows[0].status !== "pending") {
      return res.status(400).json({ error: "Only pending orders can be confirmed." });
    }

    await runSql("UPDATE orders SET status = 'confirmed' WHERE id = ?", [orderId]);
    res.json({ success: true, status: "confirmed" });
  } catch (error) {
    console.error("Order confirmation failed:", error);
    res.status(500).json({ error: "Unable to confirm the order." });
  }
});

app.post("/api/orders/:id/cancel", requireSellerLogin, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "Invalid order id." });
  }

  try {
    const orderRows = await getSql("SELECT status FROM orders WHERE id = ?", [orderId]);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (orderRows[0].status === "cancelled") {
      return res.status(400).json({ error: "This order has already been cancelled." });
    }

    const items = await getSql(
      "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
      [orderId]
    );

    for (const item of items) {
      await runSql(
        "UPDATE products SET quantity = quantity + ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }

    await runSql("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);
    res.json({ success: true, status: "cancelled" });
  } catch (error) {
    console.error("Order cancellation failed:", error);
    res.status(500).json({ error: "Unable to cancel the order." });
  }
});

app.post("/api/orders", async (req, res) => {
  const customerName = String(req.body.customerName || "").trim();
  const phone = String(req.body.phone || "").trim();
  const address = String(req.body.address || "").trim();
  const paymentMethod = String(req.body.paymentMethod || "").trim();
  const notes = String(req.body.notes || "").trim();
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!customerName || !phone || !address || !paymentMethod) {
    return res.status(400).json({ error: "Name, phone, address, and payment method are required." });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: "At least one product is required for the order." });
  }

  try {
    const validatedItems = [];
    let total = 0;

    for (const rawItem of items) {
      const productId = Number(rawItem.productId);
      const requestedQuantity = Number(rawItem.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: "Each item must include a valid product id." });
      }

      if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
        return res.status(400).json({ error: "Each product quantity must be at least 1." });
      }

      const productRows = await getSql(
        "SELECT id, name, size, price, quantity FROM products WHERE id = ?",
        [productId]
      );

      if (productRows.length === 0) {
        return res.status(404).json({ error: `Product ${productId} was not found.` });
      }

      const product = productRows[0];
      if (requestedQuantity > product.quantity) {
        return res.status(400).json({
          error: `Not enough stock for ${product.name}. Available: ${product.quantity}.`
        });
      }

      const lineTotal = product.price * requestedQuantity;
      validatedItems.push({
        productId: product.id,
        productName: product.name,
        quantity: requestedQuantity,
        unitPrice: product.price,
        totalPrice: lineTotal
      });
      total += lineTotal;
    }

    const orderResult = await runSql(
      "INSERT INTO orders (customer_name, phone, address, payment_method, notes, total) VALUES (?, ?, ?, ?, ?, ?)",
      [customerName, phone, address, paymentMethod, notes, total]
    );

    for (const item of validatedItems) {
      await runSql(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)",
        [orderResult.id, item.productId, item.productName, item.quantity, item.unitPrice, item.totalPrice]
      );

      await runSql(
        "UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?",
        [item.quantity, item.productId, item.quantity]
      );
    }

    res.status(201).json({
      success: true,
      orderId: orderResult.id,
      status: "pending",
      total
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    res.status(500).json({ error: "Unable to place the order." });
  }
});

app.get("/api/orders", requireSellerLogin, async (req, res) => {
  try {
    const orders = await getSql(
      `
        SELECT o.id, o.customer_name, o.phone, o.address, o.payment_method, o.notes, o.status, o.total, o.created_at,
               json_group_array(
                 json_object(
                   'productId', oi.product_id,
                   'productName', oi.product_name,
                   'quantity', oi.quantity,
                   'unitPrice', oi.unit_price,
                   'totalPrice', oi.total_price
                 )
               ) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `
    );

    res.json({ orders });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    res.status(500).json({ error: "Unable to fetch orders." });
  }
});

app.get("/api/dashboard/summary", requireSellerLogin, async (req, res) => {
  try {
    const inventory = await getSql(`
      SELECT
        COUNT(*) AS totalProducts,
        SUM(CASE WHEN quantity <= 5 THEN 1 ELSE 0 END) AS lowStockProducts,
        SUM(quantity) AS totalUnits
      FROM products
    `);

    const orderStats = await getSql(`
      SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingOrders,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmedOrders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total ELSE 0 END), 0) AS confirmedRevenue,
        COALESCE(AVG(CASE WHEN status = 'confirmed' THEN total END), 0) AS averageOrderValue,
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND((SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2)
        END AS conversionRate
      FROM orders
    `);

    const topProduct = await getSql(`
      SELECT oi.product_name AS name, SUM(oi.quantity) AS unitsSold
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'confirmed'
      GROUP BY oi.product_name
      ORDER BY unitsSold DESC, oi.product_name ASC
      LIMIT 1
    `);

    const salesByDay = await getSql(`
      SELECT
        date(created_at) AS date,
        COUNT(*) AS orderCount,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total ELSE 0 END), 0) AS revenue
      FROM orders
      GROUP BY date(created_at)
      ORDER BY date(created_at) DESC
      LIMIT 7
    `);

    const visitorsByDay = await getSql(`
      SELECT
        visit_date AS date,
        COUNT(*) AS visitorCount
      FROM visitors
      WHERE visit_date >= date('now', '-6 days')
      GROUP BY visit_date
      ORDER BY visit_date DESC
      LIMIT 7
    `);

    const todayVisitors = await getSql(
      "SELECT COUNT(*) AS visitorCount FROM visitors WHERE visit_date = date('now')"
    );

    const totalVisitors = Number(todayVisitors[0]?.visitorCount || 0);
    const totalOrdersPlaced = Number(orderStats[0]?.totalOrders || 0);
    const totalConfirmedOrders = Number(orderStats[0]?.confirmedOrders || 0);
    const calculatedConversion = totalVisitors > 0 ? (totalConfirmedOrders / totalVisitors) * 100 : 0;

    const summary = {
      totalProducts: Number(inventory[0]?.totalProducts || 0),
      lowStockProducts: Number(inventory[0]?.lowStockProducts || 0),
      totalUnits: Number(inventory[0]?.totalUnits || 0),
      totalOrders: totalOrdersPlaced,
      ordersPlaced: totalOrdersPlaced,
      pendingOrders: Number(orderStats[0]?.pendingOrders || 0),
      confirmedOrders: totalConfirmedOrders,
      ordersConfirmed: totalConfirmedOrders,
      cancelledOrders: Number(orderStats[0]?.cancelledOrders || 0),
      confirmedRevenue: Number(orderStats[0]?.confirmedRevenue || 0),
      averageOrderValue: Number(orderStats[0]?.averageOrderValue || 0),
      conversionRate: calculatedConversion,
      totalVisitors,
      visitorsByDay: visitorsByDay.map((entry) => ({
        date: entry.date,
        visitorCount: Number(entry.visitorCount || 0)
      })),
      topProduct: topProduct[0] || null,
      salesByDay: salesByDay.map((entry) => ({
        date: entry.date,
        orderCount: Number(entry.orderCount || 0),
        revenue: Number(entry.revenue || 0)
      }))
    };

    res.json({ summary });
  } catch (error) {
    console.error("Failed to load dashboard summary:", error);
    res.status(500).json({ error: "Unable to load dashboard statistics." });
  }
});

app.post("/api/products", requireSellerLogin, async (req, res) => {
  const { name, size, price, quantity } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "The product name is required." });
  }

  if (!size || !String(size).trim()) {
    return res.status(400).json({ error: "The product size is required." });
  }

  const parsedPrice = Number(price);
  const parsedQuantity = Number(quantity);

  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: "The product price must be zero or more." });
  }

  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
    return res.status(400).json({ error: "The quantity must be a whole number of zero or more." });
  }

  try {
    const result = await runSql(
      "INSERT INTO products (name, size, price, quantity) VALUES (?, ?, ?, ?)",
      [String(name).trim(), String(size).trim(), parsedPrice, parsedQuantity]
    );

    const product = await getSql(
      "SELECT id, name, size, price, quantity FROM products WHERE id = ?",
      [result.id]
    );

    res.status(201).json({ product: product[0] });
  } catch (error) {
    console.error("Failed to create product:", error);
    res.status(500).json({ error: "Unable to save the product." });
  }
});

app.put("/api/products/:id", requireSellerLogin, async (req, res) => {
  const productId = Number(req.params.id);
  const { name, size, price, quantity } = req.body;

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: "Invalid product id." });
  }

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "The product name is required." });
  }

  if (!size || !String(size).trim()) {
    return res.status(400).json({ error: "The product size is required." });
  }

  const parsedPrice = Number(price);
  const parsedQuantity = Number(quantity);

  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: "The product price must be zero or more." });
  }

  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
    return res.status(400).json({ error: "The quantity must be a whole number of zero or more." });
  }

  try {
    const existingProducts = await getSql("SELECT id FROM products WHERE id = ?", [productId]);
    if (existingProducts.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    await runSql(
      "UPDATE products SET name = ?, size = ?, price = ?, quantity = ? WHERE id = ?",
      [String(name).trim(), String(size).trim(), parsedPrice, parsedQuantity, productId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update product:", error);
    res.status(500).json({ error: "Unable to update the product." });
  }
});

app.delete("/api/products/:id", requireSellerLogin, async (req, res) => {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: "Invalid product id." });
  }

  try {
    await runSql("DELETE FROM products WHERE id = ?", [productId]);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    res.status(500).json({ error: "Unable to delete the product." });
  }
});

app.get("/seller", requireSellerLogin, requirePasswordChange, (req, res) => {
  res.sendFile(path.join(__dirname, "seller.html"));
});

app.get("/", (req, res) => {
  if (req.session && req.session.sellerId) {
    return res.redirect("/seller");
  }

  return res.redirect("/login");
});

async function startServer() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`Diamond Oil server is running on http://localhost:${PORT}`);
    console.log(`Seller dashboard is available at http://localhost:${PORT}/seller`);
  });
}

startServer().catch((error) => {
  console.error("Server could not start:", error);
  process.exit(1);
});
