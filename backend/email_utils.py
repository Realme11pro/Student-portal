import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "akrmawasim6248@gmail.com"
EMAIL_PASSWORD = "pgidzwswiypahdny"

def send_otp_email(recipient_email: str, otp_code: str) -> bool:
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "🔐 Student Portal - Email Verification OTP"
        message["From"] = SENDER_EMAIL
        message["To"] = recipient_email

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 20px; }}
                .container {{ background-color: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 30px; text-align: center; max-width: 400px; margin: auto; }}
                .otp-box {{ background-color: #0f172a; color: #a855f7; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #3b82f6; }}
                .footer {{ font-size: 12px; color: #94a3b8; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🎓 Student Portal Verification</h2>
                <p>Hello,</p>
                <p>Use the verification code below to complete your account registration:</p>
                <div class="otp-box">{otp_code}</div>
                <p>This code is valid for 10 minutes. Do not share it with anyone.</p>
                <div class="footer">&copy; 2026 Student Analytics Portal</div>
            </div>
        </body>
        </html>
        """

        part = MIMEText(html_content, "html")
        message.attach(part)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, EMAIL_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, message.as_string())
            
        return True
    
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        return False