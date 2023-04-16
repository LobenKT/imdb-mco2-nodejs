const express = require('express');
const mysql = require('mysql');
const methodOverride = require('method-override');
const async = require('async');

const app = express();

// Create pool for node1
const pool1 = mysql.createPool({
  host: "34.101.51.180",
  user: "root",
  password: "",
  database: "imdbnode1",
});

// Create pool for node2
const pool2 = mysql.createPool({
  host: "34.101.237.61",
  user: "root",
  password: "",
  database: "imdbnode1",
});

// Create pool for node3
const pool3 = mysql.createPool({
  host: "34.101.160.29",
  user: "root",
  password: "",
  database: "imdbnode1",
});

// Define a function to get a connection from a pool
const getConnectionFromPool = (pool) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });
};

// Connect to pools sequentially, and if pool1 fails, connect to pool2 and pool3
const connectToAllPools = async () => {
  try {
    const connectedPool1 = await getConnectionFromPool(pool1);
    console.log('Connected to pool1!');
    connectedPool1.release();
  } catch (err) {
    console.error('Error connecting to pool1:', err);
    console.log('Connecting to pool2 and pool3...');
    try {
      const connectedPool2 = await getConnectionFromPool(pool2);
      console.log('Connected to pool2!');
      connectedPool2.release();
    } catch (err) {
      console.error('Error connecting to pool2:', err);
    }
    try {
      const connectedPool3 = await getConnectionFromPool(pool3);
      console.log('Connected to pool3!');
      connectedPool3.release();
    } catch (err) {
      console.error('Error connecting to pool3:', err);
    }
  }
};

// Connect to all pools
connectToAllPools();

// Define a function to choose pool based on availability and year column value
const choosePool = (year) => {
  if (year === undefined) {
    // If no year parameter is passed, use pool1 by default
    return pool1;
  } else if (year < 1980) {
    // If year < 1980, use pool2
    if (pool2._allConnections.length > 0) {
      // If pool2 has connections, use pool2
      return pool2;
    } else if (pool1._allConnections.length > 0) {
      // If pool2 does not have connections, use pool1
      console.warn('No connections in pool2. Falling back to pool1...');
      return pool1;
    } else {
      console.error('No connections in both pool1 and pool2!');
      return null;
    }
  } else {
    // If year >= 1980, use pool3
    if (pool3._allConnections.length > 0) {
      // If pool3 has connections, use pool3
      return pool3;
    } else if (pool1._allConnections.length > 0) {
      // If pool3 does not have connections, use pool1
      console.warn('No connections in pool3. Falling back to pool1...');
      return pool1;
    } else {
      console.error('No connections in both pool1 and pool3!');
      return null;
    }
  }
};

// Set up the app to use EJS templating engine
  app.set("view engine", "ejs");
  
  // Set up middleware to parse request bodies as JSON
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Set up routes for the CRUD operations

// Read all movies
app.get("/", (req, res) => {
  const query = "SELECT * FROM nodepadawan";
  const connection = choosePool(undefined); // Pass undefined to choosePool to use pool1 by default
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
    const connection = choosePool(undefined); // Pass undefined to choosePool to use pool1 by default
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
    const connection = choosePool(undefined); // Pass undefined to choosePool to use pool1 by default
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
    const connection = choosePool(undefined); // Pass undefined to choosePool to use pool1 by default
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
    const connection = choosePool(undefined); // Pass undefined to choosePool to use pool1 by default
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
    const connection = choosePool(undefined); // Pass undefined to choosePool to use pool1 by default
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
    const connection = choosePool(undefined); // Pass undefined to choosePool to use pool1 by default
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
    const connection = chooseConnection();
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
    const connection = chooseConnection();
    connection.query(sql, [title, director, year, actors, id], (err, results) => {
      if (err) throw err;
  
      res.redirect(`/movies/${id}`);
    });
  });
  
  // Route to handle deleting a movie
  app.delete('/movies/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM nodepadawan WHERE id = ?";
    const connection = chooseConnection();
    connection.query(sql, [id], (err, results) => {
      if (err) throw err;
  
      res.redirect('/movies');
    });
  });
  

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
