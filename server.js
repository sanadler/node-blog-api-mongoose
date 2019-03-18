"use strict";

const express = require("express");
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;

const { PORT, DATABASE_URL } = require("./config");
const { Post, Author } = require("./models");

const app = express();
app.use(express.json());

app.get("/posts", (req, res) => {
  Post.find()
    .then(posts => {
      res.json({
        posts: posts.map(post => post.serializeAllPosts())
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.get("/authors", (req, res) => {
  Author.find()  
    .then(authors => {
      res.json({
        authors: authors.map(author => author.serializeAuthor())
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.get("/posts/:id", (req, res) => {
  Post
    .findById(req.params.id).populate('author')
    .then(post => res.json(post.serializeOnePost()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.get("/authors/:id", (req, res) => {
  Author
    .findById(req.params.id).populate('author')
    .then(author => res.json(author.serializeAuthor()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.post("/posts", (req, res) => {
  const requiredFields = ["title", "content", "author_id"];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  Post.create({
    title: req.body.title,
    content: req.body.content,
    author: req.body.author_id
  })
  Post.findOne({
    title: req.body.title
  }).populate('author')
    .then(post => res.status(201).json(post.serializeOnePost()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.post("/authors", (req, res) => {
  const requiredFields = ["firstName", "lastName", "userName"];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  Author.findOne({ userName: req.body.userName })
  .then(author => {
    if (author) {
      const message = `Username already taken`;
      console.error(message);
      return res.status(400).send(message);
    }
    else {
      Author
        .create({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          userName: req.body.userName
        })
        .then(author => res.status(201).json({
            _id: author.id,
            name: `${author.firstName} ${author.lastName}`,
            userName: author.userName
          }))
        .catch(err => {
          console.error(err);
          res.status(500).json({ message: 'Internal server error' });
        });
    }
  })
  .catch(err => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });
});

app.put("/posts/:id", (req, res) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message =
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`;
    console.error(message);
    return res.status(400).json({ message: message });
  }

  const toUpdate = {};
  const updateableFields = ["title", "content"];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  Post
    .findByIdAndUpdate(req.params.id, { $set: toUpdate }).populate('author')
    .then(post => res.status(200).json(post.serializeAllPosts()))
    .catch(err => res.status(500).json({ message: "Internal server error" }));
});

app.put("/authors/:id", (req, res) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message =
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`;
    console.error(message);
    return res.status(400).json({ message: message });
  }

  Author.findOne({ userName: req.body.userName })
  .then(author => {
    if (author) {
      const message = `Username already taken`;
      console.error(message);
      return res.status(400).send(message);
    }
    else {

      const toUpdate = {};
      const updateableFields = ["firstName", "lastName", "userName"];

      updateableFields.forEach(field => {
        if (field in req.body) {
          toUpdate[field] = req.body[field];
        }
      });

    Author
      .findByIdAndUpdate(req.params.id, { $set: toUpdate })
      .then(author => res.status(200).json(author.serializeAuthor()))
      .catch(err => res.status(500).json({ message: "Internal server error" }));
    }
  })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    });
});

app.delete("/posts/:id", (req, res) => {
  Post.findByIdAndRemove(req.params.id)
    .then(post => res.status(204).end())
    .catch(err => res.status(500).json({ message: "Internal server error" }));
});

app.delete('/authors/:id', (req, res) => {
  Post
    .remove({ author: req.params.id })
    .then(() => {
      Author
        .findByIdAndRemove(req.params.id)
        .then(() => {
          res.status(204).end();
        });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.use("*", function(req, res) {
  res.status(404).json({ message: "Not Found" });
});

let server;

function runServer(databaseUrl, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(
      databaseUrl,
      err => {
        if (err) {
          return reject(err);
        }
        server = app
          .listen(port, () => {
            console.log(`Your app is listening on port ${port}`);
            resolve();
          })
          .on("error", err => {
            mongoose.disconnect();
            reject(err);
          });
      }
    );
  });
}

function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log("Closing server");
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}

 module.exports = { app, runServer, closeServer };
