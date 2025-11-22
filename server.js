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

const knexConfig = require("./knexfile");
const environment = process.env.NODE_ENV || "development";

const knex = require("knex")({
    client: "pg",
    connection: {
        host : process.env.RDS_HOST || "localhost",
        user : process.env.RDS_USER || "postgres",
        password : process.env.RDS_PASSWORD || "12345",
        database : process.env.RDS_NAME || "ConniesTrinkets",
        port : process.env.RDS_PORT || 5432
    }
});

// Global authentication middleware - runs on EVERY request
app.use((req, res, next) => {
  const openPaths = ['/', '/login', '/register', '/logout'];

  if (openPaths.includes(req.path)) {
    return next();
  }

  if (req.session.loggedIn) {
    return next();
  }

  res.render("login", { error: "Please log in to access this page" });
});

//let categories = ["keepsakes", "jewelry", "books", "clothing", "misc"];

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

app.post("/register", async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.render("register", { error: "All fields are required." });
  }

  try {
    // Check if exists
    const existing = await knex("users")
      .where({ username })
      .first();

    if (existing) {
      return res.render("register", { error: "Username already exists." });
    }

    // Insert user
    await knex("users").insert({
      username,
      password,
      name,
      role: "U"
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

app.post("/login", (req, res) => {
    let sName = req.body.username;
    let sPassword = req.body.password;
    
    knex.select("username", "password", "role")
        .from('users')
        .where("username", sName)
        .andWhere("password", sPassword)
        .then(users => {
            // Check if a user was found with matching username AND password
            if (users.length > 0) {
                const user = users[0];
                req.session.loggedIn = true;
                req.session.username = user.username;
                req.session.role = user.role;
                res.redirect("/market");
            } else {
                // No matching user found
                res.render("login", { error: "Invalid login" });
            }
        })
        .catch(err => {
            console.error("Login error:", err);
            res.render("login", { error: "Invalid login" });
        });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Market
app.get("/market", async (req, res) => {
  if (!req.session.loggedIn) {
    return res.render("login", { error: "Please login to view items." });
  }

  // Grabs the text in the search bar and puts it in a variable
  const q = req.query.q ? String(req.query.q).trim().toLowerCase() : null;

  //Takes all the categories in the query and puts them in an array or string if there is only one
  const rawCategories = req.query.categories; // may be string or array

  // Build selectedCategories array
  let selectedCategories = [];

  //Checks to see if rawCategories is an array and converts it to an array if it isn't
  if (rawCategories) {
    selectedCategories = Array.isArray(rawCategories) ? rawCategories : [rawCategories];
  }

  //Grabs all the data in the "items" table of the database
  let items = await knex("items").select("*");

  // Grabs all unique categories from our item data (for the checkboxes)
  const categories = Array.from(new Set(items.map((i) => i.category)));

  // Filtering
  let filteredItems = items;

  if (q) {
    filteredItems = filteredItems.filter((item) => {
      const name = (item.itemName || "").toLowerCase();
      const desc = (item.itemDesc || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }

  //Checks to see if remaining items are in the selected categories from the search
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
