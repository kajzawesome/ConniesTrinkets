const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.RDS_HOST || "localhost",
    user: process.env.RDS_USER || "postgres",
    password: process.env.RDS_PASSWORD || "12345",
    database: process.env.RDS_NAME || "ConniesTrinkets",
    port: process.env.RDS_PORT || 5432,
  },
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(
  session({
    secret: "family-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Helper to check login
const isLoggedIn = (req) => !!req.session.loggedIn;

// Global auth middleware for protected routes
app.use((req, res, next) => {
  const openPaths = ["/", "/login", "/register", "/logout"];
  if (
    openPaths.includes(req.path) ||
    req.path.startsWith("/css") ||
    req.path.startsWith("/js") ||
    req.path.startsWith("/images")
  ) {
    return next();
  }
  if (isLoggedIn(req)) return next();
  res.render("login", { error: "Please log in to access this page" });
});

// ----------------- Routes -----------------

// Home
app.get("/", (req, res) => {
  res.render("index", {
    title: "Home",
    user: req.session.username || null,
    loggedIn: isLoggedIn(req),
  });
});

// Register
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  const { username, password, userFirstName, userLastName } = req.body;

  if (!username || !password || !userFirstName || !userLastName) {
    return res.render("register", { error: "All fields are required." });
  }

  try {
    const existing = await knex("users").where({ username }).first();
    if (existing) return res.render("register", { error: "Username exists." });

    const [newUser] = await knex("users")
      .insert({
        username,
        password,
        userFirstName,
        userLastName,
        role: "U",
      })
      .returning("*");

    req.session.loggedIn = true;
    req.session.username = newUser.username;
    req.session.role = newUser.role;
    req.session.userID = newUser.userID;

    res.redirect("/market");
  } catch (err) {
    console.error("Registration error:", err);
    res.render("register", { error: "Registration failed." });
  }
});

// Login
app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await knex("users")
      .where({ username, password })
      .first();

    if (!user) return res.render("login", { error: "Invalid login" });

    req.session.loggedIn = true;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.userID = user.userID;

    res.redirect("/market");
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { error: "Login failed" });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Market
app.get("/market", async (req, res) => {
  const q = req.query.q ? String(req.query.q).trim().toLowerCase() : null;
  const rawCategories = req.query.categories;
  const showUnclaimed = req.query.showUnclaimed === '1'; // toggle

  let selectedCategories = [];
  if (rawCategories) {
    selectedCategories = Array.isArray(rawCategories) ? rawCategories : [rawCategories];
  }

  try {
    let items = await knex("items")
      .leftJoin("users", "items.userID", "users.userID")
      .select("items.*", knex.raw("users.username as claimedBy"));

    // Filter by search
    if (q) {
      items = items.filter(item =>
        (item.itemName || "").toLowerCase().includes(q) ||
        (item.itemDesc || "").toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (selectedCategories.length > 0) {
      items = items.filter(item => selectedCategories.includes(item.category));
    }

    // Filter unclaimed
    if (showUnclaimed) {
      items = items.filter(item => !item.userID);
    }

    res.render("market", {
      user: req.session.username,
      loggedIn: isLoggedIn(req),
      items,
      categories: Array.from(new Set(items.map(i => i.category))),
      selectedCategories,
      q,
      showUnclaimed,
    });
  } catch (err) {
    console.error("Market error:", err);
    res.status(500).send("Server Error");
  }
});

// Claim item
app.post("/claim/:id", async (req, res) => {
  if (!isLoggedIn(req)) return res.redirect("/login");
  try {
    await knex("items")
      .where({ itemID: req.params.id, userID: null })
      .update({ userID: req.session.userID, itemDateClaimed: new Date() });
    res.redirect("/market");
  } catch (err) {
    console.error("Claim error:", err);
    res.redirect("/market");
  }
});

// Unclaim item
// Unclaim item
app.post("/unclaim/:id", async (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login");

  const itemId = req.params.id;
  const userId = req.session.userID;

  try {
    // Only unclaim if this user currently owns the item
    const updated = await knex("items")
      .where({ itemID: itemId, userID: userId })
      .update({
        userID: null,
        itemDateClaimed: null
      });

    if (updated === 0) {
      // No item was updated (either invalid ID or not claimed by this user)
      console.warn(`Unclaim failed: item ${itemId} not owned by user ${userId}`);
    }

    res.redirect("/account");
  } catch (err) {
    console.error("Unclaim error:", err);
    res.status(500).send("Server Error");
  }
});


// Account page
app.get("/account", async (req, res) => {
  if (!isLoggedIn(req)) return res.render("login", { error: "Please login to access your account." });

  try {
    const userItems = await knex("items").select("*").where("userID", req.session.userID);
    let safeUsers = [];
    if (req.session.role === "M") {
      safeUsers = await knex("users").select("userID", "username", "userFirstName", "userLastName", "role");
    }

    res.render("account", {
      user: req.session.username,
      loggedIn: isLoggedIn(req),
      items: userItems,
      role: req.session.role,
      users: safeUsers,
    });
  } catch (err) {
    console.error("Account error:", err);
    res.status(500).send("Server Error");
  }
});

// Manager update users
app.post("/user/update", async (req, res) => {
  if (!isLoggedIn(req) || req.session.role !== "M") return res.status(403).send("Forbidden");

  const { username, userFirstName, userLastName, password, role } = req.body;

  try {
    const updateData = {};
    if (userFirstName) updateData.userFirstName = userFirstName;
    if (userLastName) updateData.userLastName = userLastName;
    if (password) updateData.password = password;
    if (role) updateData.role = role;

    await knex("users").where({ username }).update(updateData);

    if (req.session.username === username && role) req.session.role = role;

    res.redirect("/account");
  } catch (err) {
    console.error("User update error:", err);
    res.redirect("/account");
  }
});

// Add new item
app.get('/items/new', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'M') {
    return res.redirect('/login');
  }

  res.render('pages/add-item', {
    loggedIn: true,
    error: null
  });
});

app.post('/items', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'M') {
    return res.redirect('/login');
  }

  const { itemName, itemDesc, category } = req.body;

  const query = `
    INSERT INTO items (itemName, itemDesc, category)
    VALUES ($1, $2, $3)
  `;

  pool.query(query, [itemName, itemDesc, category])
    .then(() => res.redirect('/market'))
    .catch(err => {
      console.error(err);
      res.render('pages/add-item', {
        loggedIn: true,
        error: 'Error adding item.'
      });
    });
});

// Edit item
app.get('/item/:id/edit', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'M') {
    return res.redirect('/login');
  }

  const itemID = req.params.id;

  const query = 'SELECT * FROM items WHERE itemID = $1';

  pool.query(query, [itemID])
    .then(result => {
      const item = result.rows[0];
      if (!item) return res.redirect('/market');

      res.render('pages/edititem', {
        title: `Edit ${item.itemName}`,
        loggedIn: true,
        item
      });
    })
    .catch(err => {
      console.error(err);
      res.redirect('/market');
    });
});

app.post('/item/:id/edit', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'M') {
    return res.redirect('/login');
  }

  const itemID = req.params.id;
  const { itemName, itemDesc, category } = req.body;

  const query = `
    UPDATE items
    SET itemName = $1,
        itemDesc = $2,
        category = $3
    WHERE itemID = $4
  `;

  pool.query(query, [itemName, itemDesc, category, itemID])
    .then(() => res.redirect('/market'))
    .catch(err => {
      console.error(err);
      res.redirect('/market');
    });
});

// Delete item
app.post('/item/:id/delete', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'M') {
    return res.redirect('/login');
  }

  const itemID = req.params.id;

  const query = 'DELETE FROM items WHERE itemID = $1';

  pool.query(query, [itemID])
    .then(() => res.redirect('/market'))
    .catch(err => {
      console.error(err);
      res.redirect('/market');
    });
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
