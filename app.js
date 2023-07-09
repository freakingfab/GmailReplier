const express = require('express');
const emailController = require('./controllers/emailController');
const authenticationController = require('./controllers/authenticationController');

const app = express();
const port = 3000;

app.get('/login', authenticationController.login);
app.get('/auth/callback', authenticationController.callback);
app.get('/handle-emails', emailController.handleEmails);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
