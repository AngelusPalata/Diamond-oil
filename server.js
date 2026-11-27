const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { rateLimit } = require("express-rate-limit");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const SELLER_USERNAME = String(process.env.SELLER_USERNAME || "").trim();
const SELLER_PASSWORD = process.env.SELLER_PASSWORD || "";
const PASSWORD_HASH_ROUNDS = 12;
const dbFolder = process.env.DATABASE_DIR
  ? path.resolve(__dirname, process.env.DATABASE_DIR)
  : path.resolve(__dirname, "..", "diamond-oil-private-data");
const relativeDbFolder = path.relative(__dirname, dbFolder);
if (
  relativeDbFolder === ""
  || (relativeDbFolder !== ".." && !relativeDbFolder.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeDbFolder))
) {
  throw new Error("DATABASE_DIR must be outside the application folder.");
}
const dbPath = path.join(dbFolder, "diamond_oil.db");
const legacyDbPath = path.join(__dirname, "data", "diamond_oil.db");

if (SESSION_SECRET.length < 32 || SESSION_SECRET.startsWith("replace_with_")) {
  throw new Error("Set SESSION_SECRET to a private value that is at least 32 characters long.");
}

fs.mkdirSync(dbFolder, { recursive: true, mode: 0o700 });

if (!fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) {
  fs.renameSync(legacyDbPath, dbPath);
}

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error("Database connection failed:", error.message);
    return;
  }
  console.log("Connected to SQLite database.");
});
db.configure("busyTimeout", 5000);

let databaseQueue = Promise.resolve();

function enqueueDatabaseOperation(operation) {
  const result = databaseQueue.then(operation);
  databaseQueue = result.catch(() => {});
  return result;
}

function rawRunSql(sql, params = []) {
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

function rawGetSql(sql, params = []) {
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

function runSql(sql, params = []) {
  return enqueueDatabaseOperation(() => rawRunSql(sql, params));
}

function getSql(sql, params = []) {
  return enqueueDatabaseOperation(() => rawGetSql(sql, params));
}

function withTransaction(operation) {
  return enqueueDatabaseOperation(async () => {
    await rawRunSql("BEGIN IMMEDIATE");
    try {
      const result = await operation({ run: rawRunSql, get: rawGetSql });
      await rawRunSql("COMMIT");
      return result;
    } catch (error) {
      try {
        await rawRunSql("ROLLBACK");
      } catch (rollbackError) {
        console.error("Database transaction rollback failed:", rollbackError);
        throw rollbackError;
      }
      throw error;
    }
  });
}

function createRequestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getSessionExpiry(sess) {
  const expiresAt = sess.cookie && sess.cookie.expires
    ? new Date(sess.cookie.expires).getTime()
    : Date.now() + Number(sess.cookie && sess.cookie.maxAge || 0);
  return Number.isFinite(expiresAt) ? expiresAt : Date.now() + 8 * 60 * 60 * 1000;
}

class SQLiteSessionStore extends session.Store {
  get(sessionId, callback) {
    getSql("SELECT sess, expires FROM seller_sessions WHERE sid = ?", [sessionId])
      .then(async (rows) => {
        if (rows.length === 0) {
          callback(null, null);
          return;
        }
        if (rows[0].expires <= Date.now()) {
          await runSql("DELETE FROM seller_sessions WHERE sid = ?", [sessionId]);
          callback(null, null);
          return;
        }
        callback(null, JSON.parse(rows[0].sess));
      })
      .catch(callback);
  }

  set(sessionId, sess, callback) {
    runSql(
      `
        INSERT INTO seller_sessions (sid, sess, expires)
        VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires
      `,
      [sessionId, JSON.stringify(sess), getSessionExpiry(sess)]
    )
      .then(() => callback && callback(null))
      .catch((error) => callback && callback(error));
  }

  touch(sessionId, sess, callback) {
    runSql(
      "UPDATE seller_sessions SET expires = ? WHERE sid = ?",
      [getSessionExpiry(sess), sessionId]
    )
      .then(() => callback && callback(null))
      .catch((error) => callback && callback(error));
  }

  destroy(sessionId, callback) {
    runSql("DELETE FROM seller_sessions WHERE sid = ?", [sessionId])
      .then(() => callback && callback(null))
      .catch((error) => callback && callback(error));
  }
}

async function initDatabase() {
  await runSql("PRAGMA foreign_keys = ON");

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
    CREATE TABLE IF NOT EXISTS seller_sessions (
      sid TEXT PRIMARY KEY NOT NULL,
      sess TEXT NOT NULL,
      expires INTEGER NOT NULL
    )
  `);
  await runSql("CREATE INDEX IF NOT EXISTS idx_seller_sessions_expiry ON seller_sessions(expires)");
  await runSql("DELETE FROM seller_sessions WHERE expires <= ?", [Date.now()]);

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
    if (!SELLER_USERNAME || SELLER_PASSWORD.length < 12 || SELLER_PASSWORD.startsWith("replace_with_")) {
      throw new Error("Set SELLER_USERNAME and a private SELLER_PASSWORD that is at least 12 characters long.");
    }

    const hashedPassword = await bcrypt.hash(SELLER_PASSWORD, PASSWORD_HASH_ROUNDS);
    await runSql(
      "INSERT INTO sellers (username, password_hash, must_change_password) VALUES (?, ?, 1)",
      [SELLER_USERNAME, hashedPassword]
    );
    console.log("First seller account created from the .env settings.");
  }
}

const isProduction = NODE_ENV === "production";
if (isProduction) {
  app.set("trust proxy", 1);
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many login attempts. Please try again later." }
});

app.use(
  session({
    store: new SQLiteSessionStore(),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
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
    if (req.path.startsWith("/api/")) {
      return res.status(403).json({ error: "Change your password before using the seller dashboard." });
    }
    return res.redirect("/change-password");
  }

  return next();
}

app.use("/data", (req, res) => {
  res.sendStatus(404);
});

app.use(
  "/image",
  express.static(path.join(__dirname, "image"), {
    dotfiles: "deny",
    index: false
  })
);

const publicAssetPaths = [
  "/index.html",
  "/style.css",
  "/script.js",
  "/seller.css",
  "/seller.js",
  "/seller-translations.js",
  "/login.css",
  "/login.js",
  "/change-password.js"
];

app.get(publicAssetPaths, (req, res, next) => {
  res.sendFile(path.join(__dirname, req.path.slice(1)), (error) => {
    if (error) {
      next(error);
    }
  });
});

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
      secure: isProduction,
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

app.post("/login", loginLimiter, async (req, res) => {
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

    if (bcrypt.getRounds(seller.password_hash) < PASSWORD_HASH_ROUNDS) {
      const upgradedHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
      await runSql("UPDATE sellers SET password_hash = ? WHERE id = ?", [upgradedHash, seller.id]);
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error("Could not start a secure seller session:", sessionError);
        return res.status(500).json({ error: "Unable to start a seller session." });
      }

      req.session.sellerId = seller.id;
      req.session.mustChangePassword = Boolean(seller.must_change_password);
      req.session.save((saveError) => {
        if (saveError) {
          console.error("Could not save the seller session:", saveError);
          return res.status(500).json({ error: "Unable to save the seller session." });
        }

        return res.json({
          redirect: seller.must_change_password ? "/change-password" : "/seller"
        });
      });
    });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ error: "Unable to log in." });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Could not end the seller session:", error);
      return res.status(500).json({ error: "Unable to log out." });
    }

    res.clearCookie("connect.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/"
    });
    return res.json({ success: true, redirect: "/login" });
  });
});

app.get("/change-password", requireSellerLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "change-password.html"));
});

app.post("/change-password", requireSellerLogin, async (req, res) => {
  const newPassword = String(req.body.newPassword || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (newPassword.length < 12) {
    return res.status(400).json({ error: "The new password must be at least 12 characters long." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  try {
    const sellerId = req.session.sellerId;
    const hashedPassword = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
    await runSql(
      "UPDATE sellers SET password_hash = ?, must_change_password = 0 WHERE id = ?",
      [hashedPassword, sellerId]
    );

    req.session.mustChangePassword = false;
    req.session.save((sessionError) => {
      if (sessionError) {
        console.error("Could not save the updated seller session:", sessionError);
        return res.status(500).json({ error: "Unable to save the seller session." });
      }
      return res.json({ success: true, redirect: "/seller" });
    });
  } catch (error) {
    console.error("Password update failed:", error);
    return res.status(500).json({ error: "Unable to change the password." });
  }
});

app.get("/api/products", requireSellerLogin, requirePasswordChange, async (req, res) => {
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

app.post("/api/orders/:id/confirm", requireSellerLogin, requirePasswordChange, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "Invalid order id." });
  }

  try {
    await withTransaction(async function(transaction) {
      const orderRows = await transaction.get("SELECT status FROM orders WHERE id = ?", [orderId]);
      if (orderRows.length === 0) {
        throw createRequestError(404, "Order not found.");
      }

      if (orderRows[0].status !== "pending") {
        throw createRequestError(400, "Only pending orders can be confirmed.");
      }

      const items = await transaction.get(
        "SELECT product_id, quantity, product_name FROM order_items WHERE order_id = ?",
        [orderId]
      );
      const products = [];

      for (const item of items) {
        const productRows = await transaction.get(
          "SELECT id, name, quantity FROM products WHERE id = ?",
          [item.product_id]
        );
        if (productRows.length === 0) {
          throw createRequestError(404, `Product ${item.product_name} was not found.`);
        }

        if (item.quantity > productRows[0].quantity) {
          throw createRequestError(
            400,
            `Not enough stock for ${productRows[0].name}. Available: ${productRows[0].quantity}.`
          );
        }
        products.push(item);
      }

      for (const item of products) {
        await transaction.run(
          "UPDATE products SET quantity = quantity - ? WHERE id = ?",
          [item.quantity, item.product_id]
        );
      }

      const result = await transaction.run(
        "UPDATE orders SET status = 'confirmed' WHERE id = ? AND status = 'pending'",
        [orderId]
      );
      if (result.changes !== 1) {
        throw createRequestError(409, "The order status changed before it could be confirmed.");
      }
    });
    res.json({ success: true, status: "confirmed" });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Order confirmation failed:", error);
    res.status(500).json({ error: "Unable to confirm the order." });
  }
});

app.post("/api/orders/:id/cancel", requireSellerLogin, requirePasswordChange, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "Invalid order id." });
  }

  try {
    await withTransaction(async function(transaction) {
      const orderRows = await transaction.get("SELECT status FROM orders WHERE id = ?", [orderId]);
      if (orderRows.length === 0) {
        throw createRequestError(404, "Order not found.");
      }

      const currentStatus = orderRows[0].status;
      if (currentStatus === "cancelled") {
        throw createRequestError(400, "This order has already been cancelled.");
      }
      if (currentStatus !== "pending" && currentStatus !== "confirmed") {
        throw createRequestError(400, "This order cannot be cancelled.");
      }

      if (currentStatus === "confirmed") {
        const items = await transaction.get(
          "SELECT product_id, quantity, product_name FROM order_items WHERE order_id = ?",
          [orderId]
        );

        for (const item of items) {
          const productRows = await transaction.get(
            "SELECT id FROM products WHERE id = ?",
            [item.product_id]
          );
          if (productRows.length === 0) {
            throw createRequestError(409, `Cannot restore stock for ${item.product_name}; the product no longer exists.`);
          }
        }

        for (const item of items) {
          await transaction.run(
            "UPDATE products SET quantity = quantity + ? WHERE id = ?",
            [item.quantity, item.product_id]
          );
        }
      }

      const result = await transaction.run(
        "UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = ?",
        [orderId, currentStatus]
      );
      if (result.changes !== 1) {
        throw createRequestError(409, "The order status changed before it could be cancelled.");
      }
    });
    res.json({ success: true, status: "cancelled" });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Order cancellation failed:", error);
    res.status(500).json({ error: "Unable to cancel the order." });
  }
});

app.post("/api/orders", async (req, res) => {
  const requestBody = req.body && typeof req.body === "object" ? req.body : {};
  const customerName = String(requestBody.customerName || "").trim();
  const phone = String(requestBody.phone || "").trim();
  const address = String(requestBody.address || "").trim();
  const paymentMethod = String(requestBody.paymentMethod || "").trim();
  const notes = String(requestBody.notes || "").trim();
  const items = Array.isArray(requestBody.items) ? requestBody.items : [];

  if (!customerName || !phone || !address || !paymentMethod) {
    return res.status(400).json({ error: "Name, phone, address, and payment method are required." });
  }

  if (!/^[+()0-9\s-]{7,20}$/.test(phone)) {
    return res.status(400).json({ error: "Please enter a valid phone number." });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: "At least one product is required for the order." });
  }

  if (items.length > 50) {
    return res.status(400).json({ error: "An order can contain at most 50 different products." });
  }

  try {
    const order = await withTransaction(async (transaction) => {
      const requestedQuantities = new Map();
      for (const rawItem of items) {
        const productId = Number(rawItem && rawItem.productId);
        const quantity = Number(rawItem && rawItem.quantity);

        if (!Number.isSafeInteger(productId) || productId <= 0) {
          throw createRequestError(400, "Each item must include a valid product id.");
        }

        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
          throw createRequestError(400, "Each product quantity must be at least 1.");
        }

        const combinedQuantity = (requestedQuantities.get(productId) || 0) + quantity;
        if (!Number.isSafeInteger(combinedQuantity)) {
          throw createRequestError(400, "The requested product quantity is too large.");
        }
        requestedQuantities.set(productId, combinedQuantity);
      }

      const validatedItems = [];
      let total = 0;
      for (const [productId, requestedQuantity] of requestedQuantities) {
        const productRows = await transaction.get(
          "SELECT id, name, price, quantity FROM products WHERE id = ?",
          [productId]
        );

        if (productRows.length === 0) {
          throw createRequestError(404, `Product ${productId} was not found.`);
        }

        const product = productRows[0];
        if (requestedQuantity > product.quantity) {
          throw createRequestError(
            400,
            `Not enough stock for ${product.name}. Available: ${product.quantity}.`
          );
        }

        const lineTotal = product.price * requestedQuantity;
        if (!Number.isFinite(lineTotal)) {
          throw createRequestError(400, "The order total is too large.");
        }

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: requestedQuantity,
          unitPrice: product.price,
          totalPrice: lineTotal
        });
        total += lineTotal;
      }

      if (!Number.isFinite(total)) {
        throw createRequestError(400, "The order total is too large.");
      }

      const orderResult = await transaction.run(
        "INSERT INTO orders (customer_name, phone, address, payment_method, notes, total) VALUES (?, ?, ?, ?, ?, ?)",
        [customerName, phone, address, paymentMethod, notes, total]
      );

      for (const item of validatedItems) {
        await transaction.run(
          "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)",
          [orderResult.id, item.productId, item.productName, item.quantity, item.unitPrice, item.totalPrice]
        );
      }

      return { orderId: orderResult.id, total, items: validatedItems };
    });

    res.status(201).json({
      success: true,
      orderId: order.orderId,
      status: "pending",
      total: order.total,
      items: order.items
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Order creation failed:", error);
    res.status(500).json({ error: "Unable to place the order." });
  }
});

app.get("/api/orders", requireSellerLogin, requirePasswordChange, async (req, res) => {
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

app.get("/api/dashboard/summary", requireSellerLogin, requirePasswordChange, async (req, res) => {
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
        SUM(CASE WHEN status = 'confirmed' AND date(created_at) = date('now') THEN 1 ELSE 0 END) AS todayConfirmedOrders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total ELSE 0 END), 0) AS confirmedRevenue,
        COALESCE(AVG(CASE WHEN status = 'confirmed' THEN total END), 0) AS averageOrderValue
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

    const slowestProduct = await getSql(`
      SELECT oi.product_name AS name, SUM(oi.quantity) AS unitsSold
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'confirmed'
      GROUP BY oi.product_name
      ORDER BY unitsSold ASC, oi.product_name ASC
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

    const revenueByPeriod = await getSql(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'confirmed' AND date(created_at) = date('now') THEN total ELSE 0 END), 0) AS todayRevenue,
        COALESCE(SUM(CASE WHEN status = 'confirmed' AND date(created_at) >= date('now', '-6 days') THEN total ELSE 0 END), 0) AS weekRevenue,
        COALESCE(SUM(CASE WHEN status = 'confirmed' AND date(created_at) >= date('now', 'start of month') THEN total ELSE 0 END), 0) AS monthRevenue
      FROM orders
    `);

    const productPerformance = await getSql(`
      SELECT
        p.name,
        p.quantity AS stockLeft,
        COALESCE(SUM(CASE WHEN o.status = 'confirmed' THEN oi.quantity ELSE 0 END), 0) AS quantitySold,
        COALESCE((p.quantity + SUM(CASE WHEN o.status = 'confirmed' THEN oi.quantity ELSE 0 END)), p.quantity) AS startingStock,
        COALESCE(SUM(CASE WHEN o.status = 'confirmed' THEN oi.total_price ELSE 0 END), 0) AS moneyEarned
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id
      GROUP BY p.id, p.name, p.quantity
      ORDER BY p.name ASC
    `);

    const totalVisitors = Number(todayVisitors[0]?.visitorCount || 0);
    const totalOrdersPlaced = Number(orderStats[0]?.totalOrders || 0);
    const totalConfirmedOrders = Number(orderStats[0]?.confirmedOrders || 0);
    const todayConfirmedOrders = Number(orderStats[0]?.todayConfirmedOrders || 0);
    const calculatedConversion = totalVisitors > 0 ? (todayConfirmedOrders / totalVisitors) * 100 : 0;

    const summary = {
      totalProducts: Number(inventory[0]?.totalProducts || 0),
      lowStockProducts: Number(inventory[0]?.lowStockProducts || 0),
      totalUnits: Number(inventory[0]?.totalUnits || 0),
      totalOrders: totalOrdersPlaced,
      ordersPlaced: totalOrdersPlaced,
      pendingOrders: Number(orderStats[0]?.pendingOrders || 0),
      confirmedOrders: totalConfirmedOrders,
      ordersConfirmed: totalConfirmedOrders,
      todayConfirmedOrders,
      cancelledOrders: Number(orderStats[0]?.cancelledOrders || 0),
      confirmedRevenue: Number(orderStats[0]?.confirmedRevenue || 0),
      todayRevenue: Number(revenueByPeriod[0]?.todayRevenue || 0),
      weekRevenue: Number(revenueByPeriod[0]?.weekRevenue || 0),
      monthRevenue: Number(revenueByPeriod[0]?.monthRevenue || 0),
      averageOrderValue: Number(orderStats[0]?.averageOrderValue || 0),
      conversionRate: calculatedConversion,
      totalVisitors,
      visitorsByDay: visitorsByDay.map((entry) => ({
        date: entry.date,
        visitorCount: Number(entry.visitorCount || 0)
      })),
      topProduct: topProduct[0] || null,
      slowestProduct: slowestProduct[0] || null,
      salesByDay: salesByDay.map((entry) => ({
        date: entry.date,
        orderCount: Number(entry.orderCount || 0),
        revenue: Number(entry.revenue || 0)
      })),
      productPerformance: productPerformance.map((entry) => ({
        name: entry.name,
        startingStock: Number(entry.startingStock || 0),
        quantitySold: Number(entry.quantitySold || 0),
        stockLeft: Number(entry.stockLeft || 0),
        moneyEarned: Number(entry.moneyEarned || 0)
      }))
    };

    res.json({ summary });
  } catch (error) {
    console.error("Failed to load dashboard summary:", error);
    res.status(500).json({ error: "Unable to load dashboard statistics." });
  }
});

app.post("/api/products", requireSellerLogin, requirePasswordChange, async (req, res) => {
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

app.put("/api/products/:id", requireSellerLogin, requirePasswordChange, async (req, res) => {
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

app.delete("/api/products/:id", requireSellerLogin, requirePasswordChange, async (req, res) => {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: "Invalid product id." });
  }

  try {
    await withTransaction(async function(transaction) {
      const products = await transaction.get("SELECT id FROM products WHERE id = ?", [productId]);
      if (products.length === 0) {
        throw createRequestError(404, "Product not found.");
      }

      const openOrders = await transaction.get(
        `
          SELECT o.id
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = ? AND o.status IN ('pending', 'confirmed')
          LIMIT 1
        `,
        [productId]
      );
      if (openOrders.length > 0) {
        throw createRequestError(
          409,
          "This product has a pending or confirmed order. Cancel the order before deleting the product."
        );
      }

      await transaction.run("DELETE FROM products WHERE id = ?", [productId]);
    });
    res.json({ success: true });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Failed to delete product:", error);
    res.status(500).json({ error: "Unable to delete the product." });
  }
});

app.get("/seller", requireSellerLogin, requirePasswordChange, (req, res) => {
  res.sendFile(path.join(__dirname, "seller.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
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
