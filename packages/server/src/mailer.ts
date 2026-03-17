import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT || '587', 10),
	secure: process.env.SMTP_SECURE === 'true',
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

transporter.verify((err) => {
	if (err) console.error('SMTP connection failed:', err);
	else console.log('SMTP ready');
});

export default transporter;
