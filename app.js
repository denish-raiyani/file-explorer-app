const express = require("express");
const fileupload = require("express-fileupload");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const app = express();
const BASE_DIR = path.join(__dirname, "assets");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileupload());

// "express.static" Middleware to serve static files
app.use("/static", express.static(BASE_DIR));

// Route: Root
app.get("/", (req, res) => {
  res.send(`I am Root Route.`);
});

// Route: create a folder
app.post("/create-folder", (req, res) => {
  // console.log(req.body);
  const { folderName } = req.body;
  const folderPath = path.join(BASE_DIR, folderName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    res.status(200).send(`Folder "${folderName}" created successfully.`);
  } else {
    res.status(400).send(`Folder "${folderName}" already exist.`);
  }
});

// Route: upload a file
app.post("/upload-file", (req, res) => {
  // console.log(req.body);
  // console.log(req.files);

  const { folderName } = req.body;
  const { file } = req.files;

  const fileName = file.name;
  const fileBufferData = file.data;

  const folderPath = path.join(BASE_DIR, folderName);
  const filePath = path.join(BASE_DIR, folderName, fileName);

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

// Route: download a file
app.get("/download", (req, res) => {
  const requestedPath = req.query.path;
  // console.log(requestedPath);

  if (!requestedPath) {
    return res.status(400).send(`No "path" provided`);
  }

  if (Array.isArray(requestedPath)) {
    // Create ZIP file to download multiple files
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    // catch error
    archive.on("error", (err) => {
      return res.status(500).send(`error: ${err.message}`);
    });

    res.attachment("files.zip"); // Sets the HTTP response 'Content-Disposition' header field to “attachment”

    archive.pipe(res);

    // access paths
    requestedPath.forEach((filePath) => {
      const fullPath = path.join(BASE_DIR, filePath);
      // console.log(fullPath);

      archive.file(fullPath, { name: path.basename(fullPath) }); // append a file
    });

    archive.finalize();
  } else {
    // single file download
    const filePath = path.join(BASE_DIR, requestedPath);
    // console.log(filePath);

    // res.download(filePath, (err) => {
    //   if (err) {
    //     return res.status(404).send(`No such a file or directory. Add the correct path.`).end();
    //   }
    // });

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).send(`No such a file or directory. Add the correct path.`);
      } else {
        res.setHeader("Content-disposition", `attachment; filename=${path.basename(filePath)}`);
        res.setHeader("Content-type", "application/octet-stream");

        const fileStream = fs.createReadStream(filePath);
        console.log(fileStream);

        fileStream.pipe(res);

        fileStream.on("error", (err) => {
          res.status(500).send(`Failed to Read File`);
        });

        res.on("finish", () => {
          console.log(`File successfully downloaded.`);
        });
      }
    });
  }
});

// Route: preview a file
app.get("/preview", (req, res) => {
  const requestedPath = req.query.path;
  const filePath = path.join(BASE_DIR, requestedPath);

  res.sendFile(filePath, (err) => {
    if (err) {
      return res.status(404).send(`No such a file. Add the correct path.`).end();
    }
  });
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
