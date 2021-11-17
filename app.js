const express = require("express");
const app = express();
const fs = require('fs')

const pdfParser = require('pdf-parse')
const crypto = require("crypto");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");

// Middlewares
app.use(express.json());
app.set("view engine", "ejs");

// DB
const mongoURI = "mongodb+srv://bharath:a123456@cluster0.ihxbq.mongodb.net/ecom?retryWrites=true&w=majority";

// connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// init gfs
let gfs;
conn.once("open", () => {
    // init stream
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads"
  });
});



// Storage
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        
        

          
        const filename = (file.originalname);
        
        const fileInfo = {
          filename: filename,
          bucketName: "uploads"
          
        };
        resolve(fileInfo);
        
      });
    });
    

  }
});

const upload = multer({
  
  storage
});


const readPdf = async (uri) => {
  const buffer = fs.readFileSync(uri);
  try {
      const data = await pdfParser(buffer);

      // The content
      console.log('Content: ', data.text); 

      // Total page
      console.log('Total pages: ', data.numpages);

      // File information
      console.log('Info: ', data.info);
  }catch(err){
      throw new Error(err);
  }
  
}




//readPdf(file)




// get / page
app.get("/", (req, res) => {
  if(!gfs) {
    console.log("some error occured, check connection to db");
    res.send("some error occured, check connection to db");
    process.exit(0);
  }
  

  gfs.find().toArray((err, files) => {
    // check if files
    if (!files || files.length === 0) {
      return res.render("index", {
        files: false
      });
    } else {
      const f = files
        .map(file => {
          if (
            file.contentType === "pdf" ||
            file.contentType === "pdf"
          ) {
            file.isPdf = true;
          } else {
            file.isPdf = false;
          }
          return file;
        })
        .sort((a, b) => {
          return (
            new Date(b["uploadDate"]).getTime() -
            new Date(a["uploadDate"]).getTime()
          );
        });
        
      return res.render("index", {
        files: f
      });
    }

    // return res.json(files);
  });
});

app.post("/upload", upload.single("file"), (req, res) => {
  
  
  res.redirect("/");
});

app.get("/files", (req, res) => {
  gfs.find().toArray((err, files) => {
    // check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "no files exist"
      });
    }

    return res.json(files);
  });
});

app.get("/files/:filename", (req, res) => {
  gfs.find(
    {
      filename: req.params.filename
    },
    (err, file) => {
      
      if (!file) {
        return res.status(404).json({
          err: "no files exist"
        });
      }
      

      return res.json(file);
    }
  );
});

app.get("/pdf/:filename", (req, res) => {
  // console.log('id', req.params.id)
  const file = gfs
    .find({
      filename: req.params.filename
    })
    .toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: "no files exist"
        });
      }
      gfs.openDownloadStreamByName(req.params.filename).pipe(res);
    });
});

// files/del/:id
// Delete chunks from the db
app.post("/files/del/:id", (req, res) => {
  gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
    if (err) return res.status(404).json({ err: err.message });
    res.redirect("/");
  });
});

app.post("/files", (err,file) => {
  readPdf(file)
})
const port = 5001;

app.listen(port, () => {
  console.log("server started on " + port);
});
