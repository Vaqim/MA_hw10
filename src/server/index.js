const express = require('express');
const bodyParser = require('body-parser');

// const routes = require('./routes');
const middlewares = require('./middlewares');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello from home page!');
});

// app.use('/order', routes.order);

app.use(middlewares.errorHandler);

module.exports = app;
