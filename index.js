import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "World",
  password: "raysanaa",
  port: 5434,
});
db.connect();

let currentUserId = 1;
let users = [];

async function checkVisited() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries WHERE user_id = $1",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });

  console.log(result.rows);
  console.log(countries);
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body.country.toLowerCase();
  const currentUser = await getCurrentUser();
  try {
    const exactReq = await db.query(
      "SELECT * FROM countries WHERE LOWER(country_name) = $1",
      [input]
    );
    const patternReq = await db.query(
      "SELECT * FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%'",
      [input]
    );

    const result = patternReq.rows.length > 1 ? exactReq : patternReq;
    const countryCode = result.rows[0].country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
      const countries = await checkVisited();
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: currentUser.color,
        error: "Country has already been added, try again",
      });
    }
  } catch (err) {
    console.log(err);
    const countries = await checkVisited();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      error: "Country name does not exist, try again",
    });
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
      [name, color]
    ); //returns the new added record

    currentUserId = result.rows[0].id;
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.render("new.ejs", { error: "User name already exists, try again" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
