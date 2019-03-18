"use strict";

var mongoose = require("mongoose");
mongoose.connect('mongodb://localhost:27017/blog-posts', { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

const commentSchema = mongoose.Schema({ content: 'string' });

const postSchema = mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "Author" },
  comments: [commentSchema]
});

const authorSchema = mongoose.Schema({
  firstName: 'string',
  lastName: 'string',
  userName: {
    type: 'string',
    unique: true
  }
});

postSchema.pre('find', function(next) {
  this.populate('author');
  next();
});

postSchema.virtual("authorString").get(function() {
  return `${this.author.firstName} ${this.author.lastName}`.trim();
});

postSchema.methods.serializeAllPosts = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    author: this.authorString,
    created: Date.now().toString()
  };
};

postSchema.methods.serializeOnePost = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    author: this.authorString,
    created: Date.now().toString(),
    comments: this.comments
  };
};

authorSchema.virtual("authorName").get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

authorSchema.methods.serializeAuthor = function() {
  return {
    _id: this._id,
    name: this.authorName,
    userName: this.userName
  };
};

const Author = mongoose.model("Author", authorSchema);
const Post = mongoose.model("Post", postSchema);

module.exports = { Post, Author };
