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

// Define an array of hosts to try connecting to
const hosts = ["34.126.93.124", "34.126.190.118", "34.142.202.75"];

// Buffer or queue to store operations to be executed on the database
const operationBuffer = [];

// Function to add an operation to the buffer or queue
function addToBuffer(operation) {
  operationBuffer.push(operation);
}

// Function to execute operations in the buffer or queue
function executeBufferedOperations(connection, res) {
  // Iterate through the buffer or queue
    for (const operation of operationBuffer) {
      console.log(operation);
      // Execute the operation on the database using the connection.query() function
      connection.query(operation.sql, operation.params, (err, result) => {
        if (err) {
          console.error('Error executing buffered operation:', err);
          return;
        }
        // Operation executed successfully, remove it from the buffer or queue
        const index = operationBuffer.indexOf(operation);
        if (index !== -1) {
          operationBuffer.splice(index, 1);
        }
      });
    
  }
  console.log("potacca")
  res.redirect("/");
}


// Function to attempt connecting to hosts sequentially
const connectToHost = (host) => {
  let index = 0; // Start with the first host in the array

  const attemptConnection = (myConnection) => {
    return new Promise((resolve, reject) => {
      if (index >= hosts.length || index >= 3) {
        // Exhausted all hosts or exceeded maximum connection attempts, reject with error message
        reject(new Error("Unable to connect to any host."));
        return;
      }

      if (host) {
        // If host parameter is provided, use it as the host for the connection
        myConnection = mysql.createConnection({
          host: host,
          user: "root",
          password: "",
          database: "imdbnode1",
        });
      } else {
        // Otherwise, use the next host in the array
        myConnection = mysql.createConnection({
          host: hosts[index],
          user: "root",
          password: "",
          database: "imdbnode1",
        });
      }

      myConnection.connect((err) => {
        if (err) {
          console.log(`Failed to connect to host ${myConnection.config.host}. Retrying with next host...`);
          myConnection.end();
          host = undefined;
          index++; 
          attemptConnection(myConnection)
            .then(resolve) // Recursively attempt connecting to the next host and resolve with connection object
            .catch(reject); // Reject with error if all hosts are exhausted
          return;
        }

        console.log(`Connected to database with host ${myConnection.config.host}!`);
        // Use the connection for further operations

        // Resolve with the connection object when successful
        resolve(myConnection);
      });
    });
  };

  return attemptConnection(null); // Start attempting to connect to hosts and return the Promise
};


// Call the connectToHost() function to start connecting to hosts
let connectionPromise = connectToHost(undefined);

// Use the returned Promise for further operations
connectionPromise
  .then((myConnection) => {
    console.log("Connection successful.");
    return myConnection; // Return the connection object
  })
  .catch((error) => {
    // Connection failed to all hosts, handle error
    console.error(error);
  });

// Function to get the connection object
const getConnection = () => {
  return connectionPromise; // Return the connection Promise
};

// Example usage of `getConnection()` to get the connection object
const connection = getConnection();

  // Set up the app to use EJS templating engine
  app.set("view engine", "ejs");
  
  // Set up middleware to parse request bodies as JSON
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Set up routes for the CRUD operations
  
  // Read all movies
  app.get("/", (req, res) => {
    // Get the connection from the connectionPromise
    getConnection().then(connection => {
      // Check if the connection host is the first host, if not, try reconnecting
      if (connection.config.host !== "34.126.93.124" && operationBuffer.length > 0) {
        console.log(`Reconnecting to first host: ${"34.126.93.124"}`);
        connectToHost("34.126.93.124") // Try reconnecting to the first host
          .then(newConnection => {
            if (newConnection.config.host !== "34.126.93.124" || newConnection.config.host === connection.config.host) {
              const query = "SELECT * FROM nodepadawan";
              connection.query(query, (err, results) => {
                if (err) {
                  console.log("Error retrieving movies:", err);
                  return;
                }
                res.render("index", { movies: results });
              });
            }
            // Execute the buffered operations if operationBuffer is not empty
            else if (operationBuffer.length > 0) {
              const queryPromises = operationBuffer.map(operation => {
                return new Promise((resolve, reject) => {
                  newConnection.query(operation.sql, operation.params, (err, result) => {
                    if (err) {
                      console.error('Error executing buffered operation:', err);
                      reject(err);
                    } else {
                      // Operation executed successfully, remove it from the buffer or queue
                      const index = operationBuffer.indexOf(operation);
                      if (index !== -1) {
                        operationBuffer.splice(index, 1);
                      }
                      resolve();
                    }
                  });
                });
              });

              // Wait for all query operations to complete
              Promise.all(queryPromises)
                .then(() => {
                  console.log("Done");
                  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                  res.set('Pragma', 'no-cache');
                  res.set('Expires', '0');
                  res.redirect("/");
                })
                .catch(err => {
                  // Handle error if any of the query operations fail
                  console.error('Error executing buffered operations:', err);
                  res.redirect("/");
                });
            }    
  
          })
          .catch(error => {
            console.log("connection failed.", error);
            connectionPromise.then(connection => {
              const query = "SELECT * FROM nodepadawan";
              connection.query(query, (err, results) => {
                if (err) {
                  console.log("Error retrieving movies:", err);
                  return;
                }
  
                res.render("index", { movies: results });
              });
            }).catch(error => {
              // Handle error if connectionPromise is rejected
              console.error(error);
            });
          });
      } else {
        // If already connected to the first host, execute the query for retrieving movies
        connection.query("SELECT * FROM nodepadawan", (err, results) => {
          if (err) {
            console.log("Error retrieving movies:", err);
            return;
          }
          res.render("index", { movies: results });
        });
      }
    }).catch(error => {
      // Handle error if connectionPromise is rejected
      console.error(error);
      res.redirect("/");
    });
  });
  
  

  //search route
  app.post('/search', (req, res) => {
    connectionPromise.then(connection => {
      const query = 'SELECT * FROM nodepadawan WHERE title LIKE ? OR genre LIKE ? OR director LIKE ? OR actor LIKE ? OR year LIKE ?';
      const searchQuery = `%${req.body.query}%`;
      connection.query(query, [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery], (err, results) => {
        if (err) {
          console.log('Error searching movies:', err);
          return;
        }
        res.render('search', { movies: results });
      });
    }).catch(error => {
      // Handle error if connectionPromise is rejected
      console.error(error);
    });
  });
  

 // Create a new movie
app.post('/addmovie', (req, res) => {
  const { title, genre, director, actor, year } = req.body;
  connectionPromise.then(connection => {
    // Check if the connection is established to the master node
    if (connection && connection.config.host === '34.126.93.124') {
      // Execute the query directly on the master node
      const query = 'INSERT INTO nodepadawan (title, genre, director, actor, year) VALUES (?, ?, ?, ?, ?)';
      connection.query(query, [title, genre, director, actor, year], (err, result) => {
        if (err) {
          console.log('Error adding movie:', err);
          res.redirect('/');
          return;
        }
        res.redirect('/');
      });
    } else {
      // Add the operation to the buffer or queue
      addToBuffer({
        sql: 'INSERT INTO nodepadawan (title, genre, director, actor, year) VALUES (?, ?, ?, ?, ?)',
        params: [title, genre, director, actor, year]
      });
      res.redirect('/');
    }
  }).catch(error => {
    // Handle error if connectionPromise is rejected
    console.error(error);
  });
});

  
  
  app.post("/movies", (req, res) => {
    const { title, director, year } = req.body;
    connectionPromise.then(connection => {
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
    }).catch(error => {
      // Handle error if connectionPromise is rejected
      console.error(error);
    });
  });
  
   
  // Read a single movie
  app.get("/movies/:id", (req, res) => {
    const { id } = req.params;
    connectionPromise.then(connection => {
      const query = "SELECT * FROM nodepadawan WHERE id = ?";
      connection.query(query, [id], (err, result) => {
        if (err) {
          console.log("Error retrieving movie:", err);
          return;
        }
        res.render("movie", { movie: result });
      });
    }).catch(error => {
      // Handle error if connectionPromise is rejected
      console.error(error);
    });
  });
  
  
  app.put("/movies/:id", (req, res) => {
    const { id } = req.params;
    const { title, genre, director, actor, year } = req.body;
    
    // Wrap the entire callback function in a connectionPromise
    connectionPromise.then(connection => {
        // Check if the connection is established to the master node
        if (connection && connection.config.host === "34.126.93.124") {
            // Execute the query directly on the master node
            const query = "UPDATE nodepadawan SET title = ?, genre = ?, director = ?, actor = ?, year = ? WHERE id = ?";
            connection.query(query, [title, genre, director, actor, year, id], (err, result) => {
                if (err) {
                    console.log("Error updating movie:", err);
                    return;
                }
                res.redirect("/");
            });
        } else {
            // Add the operation to the buffer or queue
            addToBuffer({
                sql: "UPDATE nodepadawan SET title = ?, genre = ?, director = ?, actor = ?, year = ? WHERE id = ?",
                params: [title, genre, director, actor, year, id]
            });

            res.redirect("/");
        }
    }).catch(error => {
        // Handle error if connectionPromise is rejected
        console.error(error);
    });
});
  
  
  
// Delete a movie
app.delete("/movies/:id", (req, res) => {
  const { id } = req.params;
  connectionPromise.then(connection => {
    // Check if the connection is established to the master node
    if (connection && connection.config.host === "34.126.93.124") {
      // Execute the query directly on the master node
      const query = "DELETE FROM nodepadawan WHERE id = ?";
      connection.query(query, [id], (err, result) => {
        if (err) {
          console.log("Error deleting movie:", err);
          return;
        }

        res.redirect("/");
      });
    } else {
      // Add the operation to the buffer or queue
      addToBuffer({
        sql: "DELETE FROM nodepadawan WHERE id = ?",
        params: [id]
      });
      res.redirect("/");
    }
  }).catch(error => {
    // Handle error if connectionPromise is rejected
    console.error(error);
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
    connectionPromise.then(connection => {
      const sql = "SELECT * FROM nodepadawan WHERE id = ?";
      connection.query(sql, [id], (err, results) => {
        if (err) {
          console.error("Error retrieving movie:", err);
          return;
        }
  
        const movie = results[0];
        res.render('edit', { movie });
      });
    }).catch(error => {
      // Handle error if connectionPromise is rejected
      console.error(error);
    });
  });
  

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
