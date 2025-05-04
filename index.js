require("./utils.js");

// require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");

const expireTime = 60 * 60 * 1000; //expires after 1 hr


// TO DO: secret stuff

// TO DO: database stuff

app.get('/', (req,res) => {
    res.send("<h1> Hello World!</h1>");

});


app.get('/login', (req,res) => {
    var html = `
    log in
    <form action='/loggingin' method='post'>
    <input name='username' type='text' placeholder='username'>
    <input name='password' type='password' placeholder='password'>
    <button>Submit</button>
    </form>
    `;
    res.send(html);
});


app.get("*", (req,res) => {
	res.status(404);
	res.send("Page not found - 404");
})


app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 

