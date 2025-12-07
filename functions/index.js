const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

// Configure SendGrid API key via environment variable in Cloud Functions: SENDGRID_API_KEY
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// When a new admin request is created, notify super admins via email
exports.notifySuperAdminsOnRequest = functions.firestore
  .document('admin_requests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    if (!request) return null;

    // Fetch super admins from `admins` collection with role === 'super_admin'
    const superAdminsSnap = await admin.firestore().collection('admins').where('role', '==', 'super_admin').get();
    const emails = [];
    for (const doc of superAdminsSnap.docs) {
      const d = doc.data();
      if (d && d.email) emails.push(d.email);
    }

    // Fallback: check admins_by_email docs flagged as super_admin
    const byEmailSnap = await admin.firestore().collection('admins_by_email').where('role', '==', 'super_admin').get();
    for (const doc of byEmailSnap.docs) {
      if (doc.id) emails.push(doc.id);
    }

    if (emails.length === 0) return null; // nothing to notify

    const msg = {
      to: emails,
      from: process.env.SENDGRID_FROM || 'no-reply@example.com',
      subject: `New admin request from ${request.email || request.uid}`,
      text: `A new admin registration request was submitted.\n\nName: ${request.firstName || ''} ${request.lastName || ''}\nEmail: ${request.email || ''}\nPlease review in the Admin Panel.`
    };

    try {
      await sgMail.send(msg);
    } catch (e) {
      console.error('SendGrid error', e);
    }

    return null;
  });
