const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

function reservePort() {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const { port } = listener.address();
      listener.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

test("orders and seller sessions survive a server restart", { timeout: 30000 }, async (t) => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "diamond-oil-test-"));
  const databaseDir = path.join(dataRoot, "private-data");
  let serverProcess = null;
  let serverOutput = "";
  let baseUrl = "";

  async function startServer() {
    const port = await reservePort();
    serverOutput = "";
    serverProcess = spawn(process.execPath, [path.join(projectRoot, "server.js")], {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
        DATABASE_DIR: databaseDir,
        SESSION_SECRET: "integration-test-session-secret-with-more-than-32-characters",
        SELLER_USERNAME: "integration-seller",
        SELLER_PASSWORD: "Initial-Integration-Password-2026!"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    serverProcess.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
    serverProcess.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });
    baseUrl = `http://127.0.0.1:${port}`;

    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (serverProcess.exitCode !== null) {
        throw new Error(`Server exited during startup:\n${serverOutput}`);
      }

      try {
        const response = await fetch(`${baseUrl}/api/health`);
        if (response.ok) {
          return;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    throw new Error(`Server did not become ready:\n${serverOutput}`);
  }

  async function stopServer() {
    const runningProcess = serverProcess;
    serverProcess = null;
    if (!runningProcess || runningProcess.exitCode !== null) {
      return;
    }

    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        runningProcess.kill();
        resolve();
      }, 5000);
      runningProcess.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
      runningProcess.kill();
    });
  }

  function request(url, options = {}) {
    return fetch(url, {
      ...options,
      headers: {
        "x-forwarded-proto": "https",
        ...(options.headers || {})
      }
    });
  }

  t.after(async () => {
    await stopServer();
    fs.rmSync(dataRoot, { recursive: true, force: true });
  });

  await startServer();

  for (const assetPath of [
    "/",
    "/style.css",
    "/script.js",
    "/seller.css",
    "/seller.js",
    "/seller-translations.js",
    "/login.css",
    "/login.js",
    "/change-password.js"
  ]) {
    const assetResponse = await request(`${baseUrl}${assetPath}`);
    assert.equal(assetResponse.status, 200, `${assetPath} should be served`);
  }

  const imageResponse = await request(`${baseUrl}/image/main-pic.jpeg`);
  assert.equal(imageResponse.status, 200);
  const translationsResponse = await request(`${baseUrl}/seller-translations.js`);
  assert.equal(translationsResponse.status, 200);

  const visitorResponse = await request(`${baseUrl}/api/track-visitor`);
  assert.match(visitorResponse.headers.get("set-cookie") || "", /;\s*Secure/i);

  const productsResponse = await request(`${baseUrl}/api/store/products`);
  assert.equal(productsResponse.status, 200);
  const { products } = await productsResponse.json();
  assert.ok(products.length > 0);

  const firstProduct = products[0];
  const orderPayload = {
    customerName: "Test Customer",
    phone: "+243123456789",
    address: "Test Street",
    paymentMethod: "cashOnDelivery",
    notes: "",
    items: [{ productId: firstProduct.id, quantity: 1 }]
  };
  const orderResponse = await request(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(orderPayload)
  });
  assert.equal(orderResponse.status, 201);
  const order = await orderResponse.json();
  assert.equal(order.items[0].productId, firstProduct.id);
  assert.equal(order.total, firstProduct.price);

  const invalidOrderResponse = await request(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...orderPayload,
      items: [
        { productId: firstProduct.id, quantity: 1 },
        { productId: 999999, quantity: 1 }
      ]
    })
  });
  assert.equal(invalidOrderResponse.status, 404);

  const missingBodyResponse = await request(`${baseUrl}/api/orders`, { method: "POST" });
  assert.equal(missingBodyResponse.status, 400);

  const loginResponse = await request(`${baseUrl}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "integration-seller",
      password: "Initial-Integration-Password-2026!"
    })
  });
  assert.equal(loginResponse.status, 200);
  assert.equal((await loginResponse.json()).redirect, "/change-password");
  let sessionCookie = (loginResponse.headers.get("set-cookie") || "").split(";")[0];
  assert.match(loginResponse.headers.get("set-cookie") || "", /;\s*HttpOnly/i);
  assert.match(loginResponse.headers.get("set-cookie") || "", /;\s*Secure/i);
  assert.ok(sessionCookie.startsWith("connect.sid="));

  const passwordResponse = await request(`${baseUrl}/change-password`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({
      newPassword: "Changed-Integration-Password-2026!",
      confirmPassword: "Changed-Integration-Password-2026!"
    })
  });
  assert.equal(passwordResponse.status, 200);
  sessionCookie = (passwordResponse.headers.get("set-cookie") || "").split(";")[0] || sessionCookie;

  const ordersResponse = await request(`${baseUrl}/api/orders`, {
    headers: { cookie: sessionCookie }
  });
  assert.equal(ordersResponse.status, 200);
  assert.equal((await ordersResponse.json()).orders.length, 1);

  await stopServer();
  await startServer();

  const persistedOrdersResponse = await request(`${baseUrl}/api/orders`, {
    headers: { cookie: sessionCookie }
  });
  assert.equal(persistedOrdersResponse.status, 200);
  const persistedOrders = await persistedOrdersResponse.json();
  assert.equal(persistedOrders.orders.length, 1);
  assert.equal(persistedOrders.orders[0].id, order.orderId);
  assert.equal(persistedOrders.orders[0].customer_name, "Test Customer");

  const reLoginResponse = await request(`${baseUrl}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "integration-seller",
      password: "Changed-Integration-Password-2026!"
    })
  });
  assert.equal(reLoginResponse.status, 200);
  assert.equal((await reLoginResponse.json()).redirect, "/seller");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failedLoginResponse = await request(`${baseUrl}/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "integration-seller",
        password: "incorrect-password"
      })
    });
    assert.equal(failedLoginResponse.status, 401);
  }

  const limitedLoginResponse = await request(`${baseUrl}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "integration-seller",
      password: "incorrect-password"
    })
  });
  assert.equal(limitedLoginResponse.status, 429);
});
