import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import './config.js'; // Ensures env vars are loaded

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const fromEmail = process.env.FROM_EMAIL;

let sesClient;

if (!accessKeyId || !secretAccessKey || !region || !fromEmail) {
  console.warn(
    '***************************************************************************\n' +
    '*** WARNING: AWS SES environment variables (AWS_ACCESS_KEY_ID,          ***\n' +
    '*** AWS_SECRET_ACCESS_KEY, AWS_REGION, FROM_EMAIL) are not set.         ***\n' +
    '*** Email functionality will be disabled.                               ***\n' +
    '***************************************************************************'
  );
} else {
  sesClient = new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  console.log('[Email] AWS SES service configured.');
}

/**
 * Sends an email using AWS SES.
 *
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML content of the email.
 * @returns {Promise<void>}
 */
export const sendEmail = async (to, subject, html) => {
  if (!sesClient) {
    console.error('Email sending is disabled. Missing AWS SES configuration.');
    return;
  }

  const params = {
    Source: fromEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log(`Email sent successfully to ${to}. Message ID: ${result.MessageId}`);
  } catch (error) {
    console.error('Error sending email via AWS SES:', error);
    throw new Error('Failed to send email.');
  }
};

export default { sendEmail }; 