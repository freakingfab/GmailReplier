const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const credentials = require('../config/credentials.json');

const oAuth2Client = new OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[1]
);

let accessToken = '';
let refreshToken = '';

function setTokens(token, refresh) {
  accessToken = token;
  refreshToken = refresh;
  oAuth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
}

async function createLabel(gmail, labelName) {
  try {
    const label = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    });
    return label.data.id;
  } catch (error) {
    console.error('Error creating label:', error);
    throw error;
  }
}

async function moveEmail(gmail, emailId, labelId) {
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        addLabelIds: [labelId],
        removeLabelIds: ['INBOX'],
      },
    });
  } catch (error) {
    console.error('Error moving email:', error);
    throw error;
  }
}

async function getEmailDetails(gmail, emailId) {
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full',
    });

    const email = response.data;
    const threadId = email.threadId;
    const from = await getEmailAddress(email, 'From');
    const hasReplies = await checkForReplies(gmail, threadId);

    const emailRegex = /<([^>]+)>/;
    const match = emailRegex.exec(from);
      const extractedEmail = match ? match[1] : '';
      
    return { emailId, threadId, from:extractedEmail, hasReplies };
  } catch (error) {
    console.error('Error retrieving email details:', error);
    throw error;
  }
}

async function getEmailAddress(email, type) {
  const headers = email.payload.headers;
  const header = headers.find((h) => h.name === type);
  return header ? header.value : '';
}

async function checkForReplies(gmail, messageId) {
    try {
      const response = await gmail.users.threads.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
  
      const thread = response.data;
      const messages = thread.messages;
  
      if (!messages || messages.length === 0) {
        return false;
      }
  
      // Check if any previous messages in the thread were sent by you
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const headers = message.payload.headers;
  
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          if (header.name === 'From' && header.value === 'dakshnaharoff@gmail.com') {
            return true;
          }
        }
      }
  
      return false;
    } catch (error) {
      console.error('Error checking for replies:', error);
      return false;
    }
  }
  

async function sendReply(gmail, email) {
  try {
    const messageParts = [
      'Thank you for your email. I am currently on vacation and will respond to you when I return.', // Replace with your desired reply content
      ];
      const senderEmail = 'dakshnaharoff@gmail.com';
      const message = [
        `From: ${senderEmail}`,
        `To: ${email.from}`,
        `Subject: Got it`,
        `In-Reply-To: ${email.emailId}`, // Include the thread ID as the In-Reply-To header
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        messageParts.join('\n'),
      ].join('\n');
  
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
  
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

    console.log(`Replied to email with ID: ${email.from}`);
  } catch (error) {
    console.error('Error sending reply:', error);
    throw error;
  }
}

async function getLabelId(gmail, labelName) {
    try {
      const response = await gmail.users.labels.list({
        userId: 'me',
      });
  
      const labels = response.data.labels;
      const label = labels.find((label) => label.name === labelName);
  
      return label ? label.id : null;
    } catch (error) {
      console.error('Error retrieving label:', error);
      throw error;
    }
}

async function addLabelAndMove(gmail, email) {
    try {
        const labelName = 'Replied';
    const existingLabelId = await getLabelId(gmail, labelName);

    if (!existingLabelId) {
      // Create the label if it doesn't exist
      const createdLabelId = await createLabel(gmail, labelName);
      await moveEmail(gmail, email.emailId, createdLabelId);
      console.log(`Created label '${labelName}' and moved email with ID: ${email.emailId}`);
    } else {
      // Move the email to the existing label
      await moveEmail(gmail, email.emailId, existingLabelId);
      console.log(`Moved email with ID: ${email.emailId} to label '${labelName}'`);
    }
      } catch (error) {
        console.error('Error adding label and moving email:', error);
        throw error;
      }
    }

    async function checkEmails() {
      try {
        oAuth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread',
        });

        const messages = response.data.messages;
        for (const message of messages) {
          const email = await getEmailDetails(gmail, message.id);
          if (email && !email.hasReplies) {
            await sendReply(gmail, email);
            await addLabelAndMove(gmail, email);
          }
        }
      } catch (error) {
        console.error('Error checking emails:', error);
        throw error;
      }
    }

    module.exports = {
      setTokens,
      checkEmails,
    };
