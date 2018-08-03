const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
mongoose.Promise = global.Promise;

let app = express();

const { DATABASE_URL, PORT} = require('./controller');
const { BlogPost } = require('./models');

app.use(morgan('common'));
app.use(express.json());

app.get('/posts', (req, res) => {
    BlogPost
        .find()
        .then(posts => {
            res.json(posts.map(post => post.serialize()));
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'something went wrong'});
        });
});

app.get('/posts/:id', (req, res) => {
    BlogPost
    .findById(req.params.id)
    .then(post => res.json(post.serialize()))
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: 'something did not run correctly'});
    });
});

app.post('/posts', (req, res) => {
    const requiredFields = ['title', 'content', 'author'];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `missing ${field} in request body`;
            console.error(message);
            return res.status(400).send(message);
        }
    }

    BlogPost
        .create({
            title: req.body.title,
            content: req.body.content,
            author: req.body.author
        })
        .then(blogPost => res.status(201).json(blogPost.serialize()))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'something didnt work right'});
        });
});

app.delete('/posts/:id', (req, res) => {
    BlogPost
        .findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(204).json({ message: 'success'});
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'something didnt work correctly'});
        });
});

app.put('/posts/:id', (req, res) => {
    if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
        req.status(400).json({
            error: 'Request path id and req body id values must match'
        });
    }

    const updated = {};
    const updateableFields = ['title', 'content', 'author'];
    updatedableFields.forEach(field => {
        if (field in req.body) {
            updated[field] = req.body[field];
        }
    });

    BlogPost
        .findByIdAndUpdate(req.params.id, { $set: updated }, { new: true})
        .then(updatedPost => res.status(204).end())
        .catch(err => res.status(500).json({ message: 'Something wend terribly wrong!!'}));
});

app.delete('/:id', (req, res) => {
    BlogPost
        .findByIdAndRemove(req.params.id)
        .then(() => {
            consoel.log(`Deleted blog post with id ${req.params.id}`);
            req.status(204).end();
        });
});

app.use('*', function (req, res) {
    res.status(404).json({ message: 'Not Found'});
});

let server;

function runServer(databaseUrl, port = PORT) {
    return new Promise((resolve, reject) => {
        mongoose.connect(databaseUrl, err => {
            if (err) {
                return reject(err);
            }
            server = app.listen(port, () => {
                console.log(`Your app is listening on port ${port}`);
                resolve();
            })
                .on('error', err => {
                    mongoose.disconnect();
                    reject(err);
                });
        });
    });
}

function closeServer() {
    return mongoose.disconnect().then(() => {
        return new Promise((resolve, reject) => {
            console.log('Closing server');
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

module.exports = { runServer, app, closeServer };