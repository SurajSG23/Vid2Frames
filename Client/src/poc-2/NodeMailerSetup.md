## 1️⃣ High-level flow (what actually happens)

**Frontend**

- Collect:
  - `to[]`
  - `cc[]`
  - `subject`
  - `body`
  - `file`

- Send all of this to backend as **multipart/form-data**

**Backend**

- Receive data + file
- Configure **Nodemailer with Outlook SMTP**
- Attach file
- Send mail → Outlook delivers it

📌 Important:

> Outlook is NOT opened on the client.
> The mail is sent _from backend_ using Outlook SMTP.

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
    headers: { "Content-Type": "multipart/form-data" },
  });
};
```

📌 Notes:

- `selectedFile` comes from `<input type="file" />`
- Multiple file types supported automatically

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
    pass: process.env.OUTLOOK_PASSWORD,
  },
});
```

📌 Use **App Password** if MFA is enabled.

---

## 6️⃣ API route (sending mail with attachment)

### 📁 `routes/mail.ts`

```ts
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import { upload } from "./middleware/upload";
import { transporter } from "./utils/mailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------- MIDDLEWARE -------------------- */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- ROUTES -------------------- */

app.post(
  "/send-mail",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { to, cc, subject, body } = req.body;

      if (!to || !subject) {
        return res.status(400).json({
          error: "Recipient and subject are required",
        });
      }

      const mailOptions = {
        from: process.env.OUTLOOK_EMAIL,
        to: to.split(","), // multiple recipients
        cc: cc ? cc.split(",") : undefined,
        subject,
        text: body,
        attachments: req.file
          ? [
              {
                filename: req.file.originalname,
                content: req.file.buffer,
                contentType: req.file.mimetype,
              },
            ]
          : [],
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({
        message: "Mail sent successfully",
      });
    } catch (error) {
      console.error("Mail send error:", error);
      res.status(500).json({
        error: "Failed to send mail",
      });
    }
  },
);

/* -------------------- HEALTH CHECK -------------------- */

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK" });
});

/* -------------------- SERVER START -------------------- */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

---

## 7️⃣ Supported file types (automatic)

No extra config needed for:

- ✅ PDF
- ✅ PPT / PPTX
- ✅ DOC / DOCX
- ✅ Images

Multer + Nodemailer handle MIME types automatically.

---

## 8️⃣ Environment variables (.env)

```env
OUTLOOK_EMAIL=yourmail@outlook.com
OUTLOOK_PASSWORD=your_app_password
```

---
