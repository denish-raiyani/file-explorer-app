const express = require("express");
const fileupload = require("express-fileupload");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware
app.use(fileupload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route: Root
app.get("/", (req, res) => {
  res.send(`I am Root Route.`);
});

// Route: Create New-Folder
app.post("/create-folder", (req, res) => {
  // console.log(req.body);
  const folderName = req.body.folderName;
  const folderPath = path.join(__dirname, "uploads", folderName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    res.status(200).send(`Folder "${folderName}" created successfully.`);
  } else {
    res.status(400).send(`Folder "${folderName}" already exist.`);
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
