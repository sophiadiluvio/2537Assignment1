require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require('bcrypt');
const Joi = require("joi");
const { database } = require("./databaseConnections");

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 12;

const expireTime = 60 * 60 * 1000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// serve static files from public directory
app.use(express.static('public'));

// session stuff with MongoDB store
app.use(
  session({
    secret: process.env.NODE_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`,
      crypto: {
        secret: process.env.MONGODB_SESSION_SECRET
      }
    }),
    cookie: { 
      maxAge: expireTime,
      httpOnly: true
    }
  })
);

// database connection
let userCollection;
database.connect()
  .then(() => {
    const db = database.db(process.env.MONGODB_DATABASE);
    userCollection = db.collection("users");
  });

// home page route
app.get("/", (req, res) => {
  if (!req.session.authenticated) {
    // not logged in
    res.send(`
      <h1>Home Page</h1>
      <a href="/signup">Sign up</a><br>
      <a href="/login">Log in</a>
    `);
  } else {
    // logged in
    res.send(`
      <h1>Hello, ${req.session.name}!</h1>
      <a href="/members">Go to Members Area</a><br>
      <a href="/logout">Logout</a>
    `);
  }
});

// signup page
app.get("/signup", (req, res) => {
  res.send(`
    <h1>Create User</h1>
    <form action="/signupSubmit" method="POST">
      <input type="text" name="name" placeholder="name"><br>
      <input type="email" name="email" placeholder="email"><br>
      <input type="password" name="password" placeholder="password"><br>
      <button type="submit">Submit</button>
    </form>
  `);
});

// signup form stuff
app.post('/signupSubmit', async (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
  
    // joi validation
    const schema = Joi.object({
      name: Joi.string().max(20).required(),
      email: Joi.string().email().required(),
      password: Joi.string().max(20).required()
    });
    
    const validationResult = schema.validate({ name, email, password });
    
    // checks if field is missing with null
    if (validationResult.error != null) {
      const errorMessage = validationResult.error.details[0].message;
      
      // error message depending on which field is missing
      let message = "Please provide all required fields.";
      if (errorMessage.includes("name")) {
        message = "Please provide a name.";
      } else if (errorMessage.includes("email")) {
        message = "Please provide an email address.";
      } else if (errorMessage.includes("password")) {
        message = "Please provide a password.";
      }
      
      res.send(`
        <p>${message}</p>
        <a href="/signup">Try again</a>
      `);
      return;
    }
  
    // bcrypted password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // inserts a new user
    await userCollection.insertOne({
      name: name,
      email: email,
      password: hashedPassword
    });
  
    // this creates a sessions then redirects to home page
    req.session.authenticated = true;
    req.session.name = name;
    req.session.email = email;
    res.redirect("/"); 
  });

// login page
app.get("/login", (req, res) => {
  res.send(`
    <h1>Login</h1>
    <form action="/loginSubmit" method="POST">
      <input type="email" name="email" placeholder="email"><br>
      <input type="password" name="password" placeholder="password"><br>
      <button type="submit">Login</button>
    </form>
  `);
});

// login form stuff
app.post('/loginSubmit', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
  
    // joi validation
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().max(20).required()
    });
  
    const validationResult = schema.validate({ email, password });
    if (validationResult.error != null) {
      console.log(validationResult.error);
      res.redirect("/login");
      return;
    }
  
    // find user in user collection by their email
    const user = await userCollection.findOne({ email: email });
    
    if (!user) {
      res.send(`
        <p>User and password not found.</p>
        <a href="/login">Try again</a>
      `);
      return;
    }
    
    // compare passwords and checks if they match
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (passwordMatch) {
      // creates a session with user info
      req.session.authenticated = true;
      req.session.name = user.name;
      req.session.email = user.email;
      res.redirect("/");
    } else {
      res.send(`
        <p>User and password not found.</p>
        <a href="/login">Try again</a>
      `);
    }
  });

// logout
app.get('/logout', (req,res) => {
	req.session.destroy();
    var html = `
    You are logged out.
    `;
    res.send(html);
});

// Members page
app.get("/members", (req, res) => {
    if (!req.session.authenticated) {
      res.redirect("/");
      return;
    }
    
    // array for images
    const images = [
      "/images/banana.gif", 
      "/images/spin.gif", 
      "/images/huh.gif"
    ];
    
    // picks a random image from the array
    const randomIndex = Math.floor(Math.random() * images.length);
    const imagePath = images[randomIndex];
    
    res.send(`
      <h1>Hello, ${req.session.name}!</h1>
      <img src="${imagePath}" style="max-width: 500px;" alt="Random image"><br>
      <a href="/logout">Logout</a>
    `);
  });

// error 404 catch all
app.use((req, res) => {
  res.status(404).send("Oh no! Page not found - 404");
});

// port listen
app.listen(PORT, () => {
  console.log("Node application listening on port " + PORT);
});

