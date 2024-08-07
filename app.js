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
  // res.send(`I am Root Route.`);
  res.redirect("/list");
});

app.get("/list", (req, res) => {
  const { path: requestedPath = "" } = req.query;
  const filePath = path.join(BASE_DIR, requestedPath);
  // console.log(filePath);

  // Check if the requested path is a directory or file
  fs.stat(filePath, (err, stats) => {
    if (err) {
      return res.status(500).send(`No such a file or directory. Add the correct path.`);
    }

    if (stats.isDirectory()) {
      // Show Directory list
      fs.readdir(filePath, { withFileTypes: true }, (err, files) => {
        if (err) {
          return res.status(500).send(`Unable to scan directory: ${err}`);
        }

        const fileList = files.map((file) => ({
          name: file.name,
          type: file.isDirectory() ? "Directory" : "File",
          path: path.join(filePath, file.name),
        }));

        res.send(fileList);
      });
    } else if (stats.isFile()) {
      // show a file preview
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          return res.status(404).send(`No such a file. Add the correct path.`);
        } else {
          res.sendFile(filePath);
        }
      });
    }
  });
});

// Route: create a folder
app.post("/create-folder", (req, res) => {
  // console.log(req.body);
  const { folderName } = req.body;

  if (!folderName) {
    return res.status(400).json(`folderName is required.`);
  }

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
  const { file } = req.files || {};

  if (!folderName) {
    return res.status(400).json(`folderName is required.`);
  } else if (!file) {
    return res.status(400).json(`file is required.`);
  }

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
  const { path: requestedPath } = req.query;
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
        // console.log(fileStream);

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
  const { path: requestedPath } = req.query;

  if (!requestedPath) {
    return res.status(400).send(`No "path" provided`);
  }

  const filePath = path.join(BASE_DIR, requestedPath);

  res.sendFile(filePath, (err) => {
    if (err) {
      return res.status(404).send(`No such a file. Add the correct path.`).end();
    }
  });
});

// Route: rename a directory or file
app.post("/rename", (req, res) => {
  const { path: requestedPath = "" } = req.query;
  const { oldName, newName } = req.body;

  if (!requestedPath) {
    return res.status(400).send(`No "path" provided`);
  }

  if (oldName === "") {
    return res.status(400).send(`add "oldName" to change "newName".`);
  } else if (oldName === newName) {
    return res.status(400).send(`Name already exists. No need to change.`);
  }

  const oldPath = path.join(BASE_DIR, requestedPath, oldName);
  const newPath = path.join(BASE_DIR, requestedPath, newName);

  // Check if the requested path is a directory or file
  fs.stat(oldPath, (err, stats) => {
    if (err) {
      return res
        .status(500)
        .send(`No such a file or directory. Add the correct path or "directory/file" Name.`);
    }

    if (stats.isDirectory()) {
      // check that the 'oldName' is a "directory" but the 'newName' is not a "file".
      if (path.extname(newName) !== "") {
        return res.status(400).send(`New directory name should not contain an extension.`);
      }
    } else if (stats.isFile()) {
      // check that the 'oldName' is a "file" but the 'newName' is not a "directory".
      if (path.extname(newName) === "") {
        return res.status(400).send(`New file name must include an extension.`);
      }
    } else {
      return res.status(400).send(`Path does not exist. Add the correct path.`);
    }

    fs.rename(oldPath, newPath, (err) => {
      // if (err) {
      //   return res
      //     .status(500)
      //     .send(`No such a file or directory. Add the correct path or "directory/file" Name.`);
      // }

      res.send(
        `successfully renamed ${
          stats.isDirectory() ? "Directory" : "File"
        } from "${oldName}" to "${newName}"`
      );
    });
  });
});

// Route: delete a directory or file
app.post("/delete", (req, res) => {
  const { path: requestedPath } = req.body;

  if (!requestedPath) {
    return res.status(400).send(`No "path" provided`);
  }

  const absolutePath = path.join(BASE_DIR, requestedPath);

  fs.stat(absolutePath, (err, stats) => {
    if (err) {
      return res.status(500).send(`No such a file or directory. Add the correct path.`);
    }

    if (stats.isDirectory()) {
      // Delete a Directory and its files
      const deleteFolder = (folderPath) => {
        fs.readdirSync(folderPath).forEach((file) => {
          const currentPath = path.join(folderPath, file);

          if (fs.lstatSync(currentPath).isDirectory()) {
            deleteFolder(currentPath); // delete subfolder
          } else {
            fs.unlinkSync(currentPath); // delete file
          }
        });

        // delete folder
        fs.rmdirSync(folderPath);
      };

      deleteFolder(absolutePath);
      res.send(`folder deleted succesfully`);
    } else if (stats.isFile()) {
      // Delete a File
      fs.unlinkSync(absolutePath);
      res.send(`file deleted succesfully`);
    }
  });
});

// Define "error" Middleware when a route is not available
app.use((req, res, next) => {
  res.status(404).send(`404 - Oops! This Page Could Not Be Found!`);
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
});
