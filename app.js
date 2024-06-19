const express = require("express");
const fileupload = require("express-fileupload");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileupload());

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

// Route: File Upload
app.post("/upload-file", (req, res) => {
  console.log(req.body);
  console.log(req.files);

  const folderName = req.body.folderName;
  const uploadedFile = req.files.file;

  const fileName = uploadedFile.name;
  const fileBufferData = uploadedFile.data;

  const folderPath = path.join(__dirname, "uploads", folderName);
  const filePath = path.join(__dirname, "uploads", folderName, fileName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  fs.writeFile(filePath, fileBufferData, (err) => {
    if (err) {
      return res.status(500).send(`File not saved.`);
    }
    res.send(`file saved to ${filePath}`);
  });
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
