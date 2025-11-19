const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3000;

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

// Simulated database
let users = [
  { username: "manager1", password: "managerpass1", name: "Manager One", role: "M" },
  { username: "manager2", password: "managerpass2", name: "Manager Two", role: "M" }
];

let items = [
  { id: 1, name: "Porcelain Teacup", desc: "From her 50th anniversary trip to England.", claimedBy: null, category: "Kitchen" },
  { id: 2, name: "Quilt Blanket", desc: "Handmade with love by Grandma.", claimedBy: null, category: "Bedroom" },
  { id: 3, name: "Photo Album", desc: "Family memories through the years.", claimedBy: null, category: "Memories" },
  { id: 4, name: "Silver Necklace", desc: "Gift from Grandpa on their 40th anniversary.", claimedBy: null, category: "Jewelry" },
];

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

  const category = req.query.category;
  let filteredItems = items;

  if (category) {
    filteredItems = items.filter((item) => item.category === category);
  }

  res.render("market", { user: req.session.username, items: filteredItems, category });
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
  res.render("account", { user: req.session.username, items: userItems });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
