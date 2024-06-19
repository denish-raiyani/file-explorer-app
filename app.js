const express = require("express");
const fileupload = require("express-fileupload");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware
app.use(fileupload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get("/", (req, res) => {
  res.send(`I am Root Route.`);
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
