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
    saveUninitialized: true,
  })
);

// Simulated database - remove later and use real DB
let users = [
  { username: "manager1", password: "managerpass1", name: "Manager One", role: "M" },
  { username: "manager2", password: "managerpass2", name: "Manager Two", role: "M" }
];

let items = [
  { id: 1, name: "Porcelain Teacup", desc: "From her 50th anniversary trip to England.", claimedBy: null, category: "keepsakes" },
  { id: 2, name: "Quilt Blanket", desc: "Handmade with love by Grandma.", claimedBy: null, category: "keepsakes" },
  { id: 3, name: "Photo Album", desc: "Family memories through the years.", claimedBy: null, category:"books" },
  { id: 4, name: "Silver Necklace", desc: "Gift from Grandpa on their 40th anniversary.", claimedBy: null, category: "jewelry" },
];

let categories = ["keepsakes", "jewelry", "books", "clothing", "misc"];

// Routes
app.get("/", (req, res) => {
  res.render("index", {
    user: req.session.username || null,
    loggedIn: !!req.session.loggedIn,
  });
});

// Registration
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.render("register", { error: "All fields are required." });
  }
  if (users.find(u => u.username === username)) {
    return res.render("register", { error: "Username already exists." });
  }

  users.push({ username, password, name, role: "U" });
  req.session.loggedIn = true;
  req.session.username = username;
  req.session.role = "U";
  res.redirect("/market");
});

// Login
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    req.session.loggedIn = true;
    req.session.username = username;
    req.session.role = user.role;
    res.redirect("/market");
  } else {
    res.render("login", { error: "Invalid username or password." });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Market
app.get("/market", (req, res) => {
  if (!req.session.loggedIn) {
    return res.render("login", { error: "Please login to view items." });
  }

  // Query params
  const q = req.query.q ? String(req.query.q).trim().toLowerCase() : null;
  const rawCategories = req.query.categories; // may be string or array

  // Build selectedCategories array
  let selectedCategories = [];
  if (rawCategories) {
    selectedCategories = Array.isArray(rawCategories) ? rawCategories : [rawCategories];
  }

  // All available categories for the checkbox list
  const categories = Array.from(new Set(items.map((i) => i.category)));

  // Filtering
  let filteredItems = items;

  if (q) {
    filteredItems = filteredItems.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const desc = (item.desc || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }

  if (selectedCategories.length > 0) {
    filteredItems = filteredItems.filter((item) => selectedCategories.includes(item.category));
  }

  res.render("market", {
    user: req.session.username,
    loggedIn: !!req.session.loggedIn,
    items: filteredItems,
    categories,
    selectedCategories,
    q,
  });
});

// Claim item
app.post("/claim/:id", (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login");
  const item = items.find((i) => i.id === parseInt(req.params.id));
  if (item && !item.claimedBy) {
    item.claimedBy = req.session.username;
  }
  res.redirect("/market");
});

// Unclaim item from account page
app.post("/unclaim/:id", (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login");
  const item = items.find((i) => i.id === parseInt(req.params.id));
  if (item && item.claimedBy === req.session.username) {
    item.claimedBy = null;
  }
  res.redirect("/account");
});

// Account page
app.get("/account", (req, res) => {
  if (!req.session.loggedIn) {
    return res.render("login", { error: "Please login to access your account." });
  }
  const userItems = items.filter((i) => i.claimedBy === req.session.username);
  // Pass role and users list so managers can manage accounts
  const safeUsers = users.map(u => ({ username: u.username, name: u.name, role: u.role }));
  res.render("account", { user: req.session.username, loggedIn: !!req.session.loggedIn, items: userItems, role: req.session.role, users: safeUsers });
});

// Update user info (managers only)
app.post("/user/update", (req, res) => {
  if (!req.session.loggedIn || req.session.role !== "M") return res.status(403).send("Forbidden");

  const { username, name, password, role } = req.body;
  const target = users.find(u => u.username === username);
  if (!target) return res.redirect("/account");

  if (name) target.name = name;
  if (password) target.password = password;
  if (role) target.role = role;

  // If manager edited their own role/name, update session
  if (req.session.username === username) {
    req.session.role = target.role;
    req.session.username = target.username;
  }

  res.redirect("/account");
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
