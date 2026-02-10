## 1️⃣ High-level flow (what actually happens)

**Frontend**

* Collect:

  * `to[]`
  * `cc[]`
  * `subject`
  * `body`
  * `file`
* Send all of this to backend as **multipart/form-data**

**Backend**

* Receive data + file
* Configure **Nodemailer with Outlook SMTP**
* Attach file
* Send mail → Outlook delivers it

📌 Important:

> Outlook is NOT opened on the client.
> The mail is sent *from backend* using Outlook SMTP.

---

## 2️⃣ Frontend (React + TypeScript)

### 📦 Install helper

```bash
npm install axios
```

### 🧩 React form submit example

```ts
import axios from "axios";

const sendMail = async () => {
  const formData = new FormData();

  formData.append("to", "user1@outlook.com,user2@gmail.com");
  formData.append("cc", "manager@outlook.com");
  formData.append("subject", "Project Documents");
  formData.append("body", "Please find the attached document.");
  formData.append("file", selectedFile); // File object

  await axios.post("http://localhost:5000/send-mail", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};
```

📌 Notes:

* `selectedFile` comes from `<input type="file" />`
* Multiple file types supported automatically

---

## 3️⃣ Backend setup (Node + TypeScript)

### 📦 Install dependencies

```bash
npm install nodemailer multer
npm install -D @types/nodemailer @types/multer
```

---

## 4️⃣ File upload handling (Multer)

### 📁 `middleware/upload.ts`

```ts
import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(), // keeps file in memory
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
```

---

## 5️⃣ Nodemailer configuration (Outlook SMTP)

### 📁 `utils/mailer.ts`

```ts
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.OUTLOOK_EMAIL,
    pass: process.env.OUTLOOK_PASSWORD
  }
});
```

📌 Use **App Password** if MFA is enabled.

---

## 6️⃣ API route (sending mail with attachment)

### 📁 `routes/mail.ts`

```ts
import { Router } from "express";
import { upload } from "../middleware/upload";
import { transporter } from "../utils/mailer";

const router = Router();

router.post("/send-mail", upload.single("file"), async (req, res) => {
  try {
    const { to, cc, subject, body } = req.body;

    const mailOptions = {
      from: process.env.OUTLOOK_EMAIL,
      to: to.split(","),       // multiple recipients
      cc: cc?.split(","),
      subject,
      text: body,
      attachments: req.file
        ? [{
            filename: req.file.originalname,
            content: req.file.buffer,
            contentType: req.file.mimetype
          }]
        : []
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Mail sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send mail" });
  }
});

export default router;
```

---

## 7️⃣ Supported file types (automatic)

No extra config needed for:

* ✅ PDF
* ✅ PPT / PPTX
* ✅ DOC / DOCX
* ✅ Images

Multer + Nodemailer handle MIME types automatically.

---

## 8️⃣ Environment variables (.env)

```env
OUTLOOK_EMAIL=yourmail@outlook.com
OUTLOOK_PASSWORD=your_app_password
```

---

## 9️⃣ Very important clarifications (common confusion)

### ❌ This does NOT open Outlook UI

* Outlook UI cannot be opened from backend
* This **sends mail via Outlook servers**

### ✅ Email WILL appear in:

* Sent Items of that Outlook account
* Recipient inboxes (Gmail, Outlook, etc.)

---
