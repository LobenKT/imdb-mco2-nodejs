const express = require('express');
const mysql = require('mysql');
const methodOverride = require('method-override');
const http = require('http');
const path = require('path');



/*require ('express-ws')(app);

//web socket endpoint
app.ws('/ws', function(ws, req) {
    ws.on('message', function(msg) {
        console.log(msg);
    });
    console.log('socket', req.testing);
});
*/

const bodyParser = require("body-parser");
const app = express();

const port = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(port, () => console.log(`Listening on port ${port}`));


//app.use(express.static(path.join(__dirname, '/index.html')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true }));

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
  //search route
  app.post('/search', (req, res) => {
    const query = 'SELECT * FROM nodepadawan WHERE title LIKE ? OR genre LIKE ? OR director LIKE ? OR actor LIKE ? OR year LIKE ?';
    const searchQuery = `%${req.body.query}%`;
    connection.query(query, [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery], (err, results) => {
      if (err) {
        console.log('Error searching movies:', err);
        return;
      }
      res.render('search', { movies: results });
    });
  });

  // Create a new movie
  app.post('/addmovie', (req, res) => {
    const { title, genre, director, actor, year } = req.body;
    const query = 'INSERT INTO nodepadawan (title, genre, director, actor, year) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [title, genre, director, actor, year], (err, result) => {
      if (err) {
        console.log('Error adding movie:', err);
        res.redirect('/');
        return;
      }
      res.redirect('/');
    });
  });
  app.post("/movies", (req, res) => {
    const { title, director, year } = req.body;
    const query = "INSERT INTO nodepadawan (title, director, year) VALUES (?, ?, ?)";
    connection.query(query, [title, director, year], (err, result) => {
      if (err) {
        console.log("Error creating movie:", err);
        return;
      } else {
        req.session.message = 'Movie added successfully!';
      }
      res.redirect('/');
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
// CRUD ROUTES
// Route to display all movies
app.get('/movies', (req, res) => {
    // Code to retrieve all movies from database and render the "index.ejs" template
    res.render('index');
 });

// Route to display a form for adding a new movie
app.get('/movies/new', (req, res) => {
    // Code to render the "new.ejs" template
    res.render('new');
  });
  
  // Route to handle adding a new movie
  app.post('/movies', (req, res) => {
    // Code to add new movie to database and redirect to "/movies"
   const { title, director, year } = req.body;
  const actors = req.body.actors.split(',');

  // Insert new movie into database
  connection.query('INSERT INTO nodepadawan (title, director, year) VALUES (?, ?, ?)', [title, director, year], (error, results, fields) => {
    if (error) throw error;

    const movieId = results.insertId;

    // Associate actors with movie
    const values = actors.map(actor => [movieId, actor.trim()]);
    connection.query('INSERT INTO movies_actors (movie_id, actor_name) VALUES ?', [values], (error, results, fields) => {
      if (error) throw error;

      // Redirect to movie list page
      res.redirect('/movies');
    });
  });
});
  
  // Route to display a single movie
  app.get('/movies/:id', (req, res) => {
  // Code to retrieve a single movie from the database and render the "movie.ejs" template
  Movie.findById(req.params.id, (err, movie) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else if (!movie) {
      res.sendStatus(404);
    } else {
      res.render('movie', { movie: movie });
    }
  });
});
  
  // Route to display a form for editing a movie
  app.get('/movies/:id/edit', (req, res) => {
    // Code to retrieve a single movie from the database and render the "edit.ejs" template
    const id = req.params.id;
    const sql = "SELECT * FROM nodepadawan WHERE id = ?";
  
    connection.query(sql, [id], (err, results) => {
      if (err) throw err;
  
      const movie = results[0];
      res.render('edit', { movie });
    });
  });
  
// Route to handle updating a movie
app.put('/movies/:id', (req, res) => {
    const id = req.params.id;
    const { title, director, year, actors } = req.body;
    const sql = "UPDATE nodepadawan SET title = ?, director = ?, year = ?, actors = ? WHERE id = ?";
  
    connection.query(sql, [title, director, year, actors, id], (err, results) => {
      if (err) throw err;
  
      res.redirect(`/movies/${id}`);
    });
  });
  
  // Route to handle deleting a movie
  app.delete('/movies/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM nodepadawan WHERE id = ?";
  
    connection.query(sql, [id], (err, results) => {
      if (err) throw err;
  
      res.redirect('/movies');
    });
  });
  

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
