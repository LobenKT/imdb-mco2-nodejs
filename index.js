const express = require('express');
const mysql = require('mysql');


const app = express();

//app.use(express.static(path.join(__dirname, '/index.html')));

// Set up the MySQL database connection
const connection = mysql.createConnection({
    host: "34.126.93.124",
    user: "root",
    password: "",
    database: "imdbnode1",
  });
  
  connection.connect((err) => {
    if (err) {
      console.log("Error connecting to database:", err);
      return;
    }
  
    console.log("Connected to database!");
  });
  
  // Set up the app to use EJS templating engine
  app.set("view engine", "ejs");
  
  // Set up middleware to parse request bodies as JSON
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Set up routes for the CRUD operations
  
  // Read all movies
  app.get("/", (req, res) => {
    const query = "SELECT * FROM nodepadawan";
    connection.query(query, (err, results) => {
      if (err) {
        console.log("Error retrieving movies:", err);
        return;
      }
  
      res.render("index", { movies: results });
    });
  });
  
  // Create a new movie
  app.post("/movies", (req, res) => {
    const { title, director, year } = req.body;
    const query = "INSERT INTO nodepadawan (title, director, year) VALUES (?, ?, ?)";
    connection.query(query, [title, director, year], (err, result) => {
      if (err) {
        console.log("Error creating movie:", err);
        return;
      }
  
      res.redirect("/");
    });
  });
  
  // Read a single movie
  app.get("/movies/:id", (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM nodepadawan WHERE id = ?";
    connection.query(query, [id], (err, result) => {
      if (err) {
        console.log("Error retrieving movie:", err);
        return;
      }
  
      res.render("movie", { movie: result });
    });
  });
  
  // Update a movie
  app.put("/movies/:id", (req, res) => {
    const { id } = req.params;
    const { title, director, year } = req.body;
    const query = "UPDATE nodepadawan SET title = ?, director = ?, year = ? WHERE id = ?";
    connection.query(query, [title, director, year, id], (err, result) => {
      if (err) {
        console.log("Error updating movie:", err);
        return;
      }
  
      res.redirect("/");
    });
  });
  
  // Delete a movie
  app.delete("/movies/:id", (req, res) => {
    const { id } = req.params;
    const query = "DELETE FROM nodepadawan WHERE id = ?";
    connection.query(query, [id], (err, result) => {
      if (err) {
        console.log("Error deleting movie:", err);
        return;
      }
  
      res.redirect("/");
    });
  });
app.listen(3000, () => {
    console.log('Server started on port 3000');
});
