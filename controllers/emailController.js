const gmailService = require('../services/gmailService');

async function handleEmails(req, res) {
  try {
    await gmailService.checkEmails();
    res.send('Emails processed successfully');
  } catch (error) {
    console.error('Email processing error:', error);
    res.status(500).send('Error processing emails');
  }
}
setInterval(handleEmails, 60000);
module.exports = {
  handleEmails,
};
