const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const gmailService = require('../services/gmailService');
const credentials = require('../config/credentials.json');

const oAuth2Client = new OAuth2(
  credentials.web.client_id,
  credentials.web.client_secret,
  credentials.web.redirect_uris[1]
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

function login(req, res) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  res.redirect(authUrl);
}

async function callback(req, res) {
  const code = req.query.code;

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    gmailService.setTokens(accessToken, refreshToken);

    res.redirect('/handle-emails');
  } catch (error) {
    console.error('Error getting access token:', error);
    res.status(500).send('Error getting access token');
  }
}

module.exports = {
  login,
  callback,
};
