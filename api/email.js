import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import './config.js'; // Ensures env vars are loaded

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const fromEmail = process.env.FROM_EMAIL;
const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Configure the sender with a display name
const FROM_NAME = 'Cardipool Team';
const FROM_ADDRESS = `${FROM_NAME} <${fromEmail}>`;

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
 * Creates a styled HTML email template
 */
const createEmailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cardipool Notification</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { 
            font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 0;
            background-color: #ffffff;
        }
        .email-container {
            background: white;
            padding: 40px 30px 0;
            position: relative;
            overflow: hidden;
        }
        .content {
            position: relative;
            z-index: 2;
            margin-bottom: 60px;
        }
        .waves {
            position: relative;
            height: 250px;
            margin: 0 -30px;
            background: linear-gradient(135deg, #0693e3 0%, #8ED1FC 100%);
        }
        .waves::before {
            content: '';
            display: block;
            position: absolute;
            border-radius: 100% 50%;
            width: 340px;
            height: 80px;
            background-color: white;
            right: -5px;
            top: 40px;
        }
        .waves::after {
            content: '';
            display: block;
            position: absolute;
            border-radius: 100% 50%;
            width: 300px;
            height: 70px;
            background-color: #0693e3;
            left: 0;
            top: 27px;
        }
        .waves2 {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        .waves2::before {
            content: '';
            display: block;
            position: absolute;
            border-radius: 100% 50%;
            width: 380px;
            height: 80px;
            background-color: white;
            left: -50px;
            top: 25px;
        }
        .waves2::after {
            content: '';
            display: block;
            position: absolute;
            border-radius: 100% 50%;
            width: 340px;
            height: 70px;
            background-color: #8ED1FC;
            right: 0;
            top: 15px;
        }
        .waves3 {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        .waves3::before {
            content: '';
            display: block;
            position: absolute;
            border-radius: 100% 50%;
            width: 360px;
            height: 80px;
            background-color: white;
            right: -30px;
            top: 15px;
        }
        .waves3::after {
            content: '';
            display: block;
            position: absolute;
            border-radius: 100% 50%;
            width: 320px;
            height: 70px;
            background-color: #0693e3;
            left: -20px;
            top: 5px;
        }
        .footer {
            position: absolute;
            bottom: 40px;
            left: 0;
            right: 0;
            text-align: center;
            color: white;
            z-index: 1;
        }
        .footer-logo {
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 5px;
        }
        .footer-text {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 0;
        }
        a {
            color: #2563eb;
            text-decoration: none;
        }
        p {
            margin: 1em 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="content">
            ${content}
        </div>
        
        <div class="waves">
            <div class="waves2"></div>
            <div class="waves3"></div>
            <div class="footer">
                <div class="footer-logo">cardipool</div>
                <div class="footer-text">carpooling @ stanford</div>
            </div>
        </div>
    </div>
</body>
</html>
`;

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
    Source: FROM_ADDRESS,
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
          Data: createEmailTemplate(html),
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