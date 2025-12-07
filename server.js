const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

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

// Knex / PostgreSQL
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

// ✅ Safe helper
const isLoggedIn = (req) => !!(req.session && req.session.loggedIn);

// ✅ Global auth middleware
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

// Home
app.get("/", (req, res) => {
  res.render("index", {
    user: req.session.username || null,
    loggedIn: isLoggedIn(req),
  });
});

// Registration
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.render("register", { error: "All fields are required." });
  }

  try {
    const existing = await knex("users").where({ username }).first();
    if (existing) {
      return res.render("register", { error: "Username already exists." });
    }

    await knex("users").insert({
      username,
      password,
      name,
      role: "U",
    });

    req.session.loggedIn = true;
    req.session.username = username;
    req.session.role = "U";

    res.redirect("/market");
  } catch (err) {
    console.error("Registration error:", err);
    res.render("register", { error: "Registration failed." });
  }
});

// Login
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await knex("users")
      .where({ username, password })
      .first();

    if (!user) {
      return res.render("login", { error: "Invalid login" });
    }

    req.session.loggedIn = true;
    req.session.username = user.username;
    req.session.role = user.role;

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
  let selectedCategories = [];

  if (rawCategories) {
    selectedCategories = Array.isArray(rawCategories)
      ? rawCategories
      : [rawCategories];
  }

  try {
    const items = await knex("items").select("*");

    const categories = Array.from(new Set(items.map((i) => i.category)));

    let filteredItems = items;

    if (q) {
      filteredItems = filteredItems.filter((item) => {
        const name = (item.itemName || "").toLowerCase();
        const desc = (item.itemDesc || "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (selectedCategories.length > 0) {
      filteredItems = filteredItems.filter((item) =>
        selectedCategories.includes(item.category)
      );
    }

    res.render("market", {
      user: req.session.username,
      loggedIn: isLoggedIn(req),
      items: filteredItems,
      categories,
      selectedCategories,
      q,
    });
  } catch (err) {
    console.error("Market error:", err);
    res.status(500).send("Server Error");
  }
});

// ✅ Claim item (DB version)
app.post("/claim/:id", async (req, res) => {
  if (!isLoggedIn(req)) return res.redirect("/login");

  try {
    await knex("items")
      .where({ id: req.params.id })
      .andWhere("claimedBy", null)
      .update({ claimedBy: req.session.username });

    res.redirect("/market");
  } catch (err) {
    console.error("Claim error:", err);
    res.redirect("/market");
  }
});

// ✅ Unclaim item (DB version)
app.post("/unclaim/:id", async (req, res) => {
  if (!isLoggedIn(req)) return res.redirect("/login");

  try {
    await knex("items")
      .where({ id: req.params.id, claimedBy: req.session.username })
      .update({ claimedBy: null });

    res.redirect("/account");
  } catch (err) {
    console.error("Unclaim error:", err);
    res.redirect("/account");
  }
});

// ✅ Account page – DB version
app.get("/account", async (req, res) => {
  if (!isLoggedIn(req)) {
    return res.render("login", { error: "Please login to access your account." });
  }

  try {
    const userItems = await knex("items")
      .where({ claimedBy: req.session.username });

    let safeUsers = [];

    if (req.session.role === "M") {
      const users = await knex("users").select(
        "username",
        "name",
        "role"
      );
      safeUsers = users;
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

// ✅ Manager update users
app.post("/user/update", async (req, res) => {
  if (!isLoggedIn(req) || req.session.role !== "M") {
    return res.status(403).send("Forbidden");
  }

  const { username, name, password, role } = req.body;

  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (password) updateData.password = password;
    if (role) updateData.role = role;

    await knex("users")
      .where({ username })
      .update(updateData);

    if (req.session.username === username && role) {
      req.session.role = role;
    }

    res.redirect("/account");
  } catch (err) {
    console.error("User update error:", err);
    res.redirect("/account");
  }
});

// Start server
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);