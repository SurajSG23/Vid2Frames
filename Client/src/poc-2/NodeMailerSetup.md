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
  }
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

Code:

```ts
const [selectedFile, setSelectedFile] = useState<File | null>(null);
```

```ts
const generateWord = async (type: string = "docx") => {
  try {
    const doc = await VariantWordDoc([
      variantDataFromReducer,
      variantData,
      hashedTargetValue,
      dataElastic,
    ]);

    const blob = await Packer.toBlob(doc);

    // Convert Blob → File
    const file = new File(
      [blob],
      `${variantDataFromReducer.name}.docx`,
      {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }
    );

    setSelectedFile(file);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "SUCCESS",
        msg: "Word generated and ready to send via email!",
        timeout: 3000,
      },
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });

  } catch (ex: any) {
    console.error(ex);
    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Unable to generate document",
        timeout: 3000,
      },
    });
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};
```

```ts
const generatePPT = async () => {
  try {
    const pptx = new PptxGenJS();

    let options: any = {
      day: "2-digit",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "long",
      hour12: true,
      timeZone: "Asia/Kolkata",
    };

    const date_created = new Date(variantData.count.created_on);
    const date_last_run_on = new Date(variantData.count.last_run_on);
    const formatter = new Intl.DateTimeFormat([], options);

    const processDataOfVariant: any = await ProcessService.get(
      variantData.processId
    );

    const data = {
      processDetails: {
        name: processDataOfVariant.data.data.name,
        description: processDataOfVariant.data.data.description,
      },
      variantDetails: {
        name: variantDataFromReducer.name,
        createdOn: formatting_datetime(formatter.format(date_created)),
        lastRunOn: formatting_datetime(formatter.format(date_last_run_on)),
        maxTime: epochToHHMMSS(variantData.count.max_time),
        minTime: epochToHHMMSS(variantData.count.min_time),
        avgTime: epochToHHMMSS(variantData.count.avg_time),
        noOfRuns: epochSingleToDouble(variantData.count.no_of_runs),
        appsInvolved: variantData.apps,
        coverage: variantData.coverage,
        steps: variantData.stepData,
        exported_by: "Process Analyst",
      },
    };

    const elasticData = dataElastic.current;
    const stepScreenshots: any[] = [];

    elasticData.data.elasticsearchFieldsData.forEach((item: any) => {
      stepScreenshots.push(item._source.screenshot);
    });


    const titleSlide = pptx.addSlide({});
    titleSlide.addImage({
      data: pptxData.images[0].base64,
      x: 3.8,
      y: 0,
      w: 2,
      h: 1,
    });
    titleSlide.addImage({
      data: pptxData.images[1].base64,
      x: 3.3,
      y: 1,
      w: 3,
      h: 3,
    });
    titleSlide.addText("DataFlow Finder Report", {
      x: 1,
      y: 4.5,
      fontSize: 30,
      color: "0d8390",
      align: "center",
    });

  

    const finalSlide = pptx.addSlide({});
    finalSlide.addImage({
      data: pptxData.images[0].base64,
      x: 1,
      y: 0,
      w: 2,
      h: 1,
    });
    finalSlide.addText(pptxData.paragraph, { x: 1, y: 3, fontSize: 10 });


    // Generate PPT in memory
    const pptBlob = await pptx.write("blob");

    // Convert Blob → File
    const pptFile = new File(
      [pptBlob],
      `${variantDataFromReducer.name}.pptx`,
      {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }
    );

    // Store for email attachment
    setSelectedFile(pptFile);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "SUCCESS",
        msg: "PPT generated and ready to send via email!",
        timeout: 3000,
      },
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  } catch (err: any) {
    console.error(err);
    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Unable to generate PPT",
        timeout: 3000,
      },
    });
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};
```

```ts
const generateExcel = async (type: string = "excel") => {
  try {
    const parsedData =
      variantViewerSource === "processes"
        ? variantDataFromReducer
        : JSON.parse(variantDataFromReducer.data);

    const elasticData = dataElastic.current;
    const timeStampMap: any = {};

    elasticData.data.elasticsearchFieldsData.forEach((item: any) => {
      timeStampMap[item._source.timestamp] = {
        description: item._source.description,
        screenshot: item._source.screenshot,
      };
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "Loading..." });

    const processDataOfVariant: any = await ProcessService.get(
      variantData.processId
    );

    const workbook = new Excel.Workbook();
    const metaSheet = workbook.addWorksheet("Variant Metadata");

    const epochToHHMMSS = (timems: number): string => {
      const sec_num = Math.floor(timems / 1000);
      let hours: number | string = Math.floor(sec_num / 3600);
      let minutes: number | string = Math.floor((sec_num - +hours * 3600) / 60);
      let seconds: number | string = sec_num - +hours * 3600 - +minutes * 60;

      if (hours < 10) hours = "0" + hours;
      if (minutes < 10) minutes = "0" + minutes;
      if (seconds < 10) seconds = "0" + seconds;

      return `${hours}:${minutes}:${seconds}`;
    };

    const singleToDouble = (runs: number): number | string =>
      runs < 10 ? "0" + runs : runs;

    const apptypes: any[] = [];

    Object.entries(parsedData.stepData).forEach(([_, nodeData]: any) => {
      const appType =
        hashedTargetValue.current[nodeData.screenshot]?._source?.appType ||
        hashedTargetValue.current[nodeData.screenshot]?._source?.apptype;

      if (appType && !apptypes.includes(appType)) apptypes.push(appType);
    });

    const apps = apptypes.join();

    const arrData = [
      { varDet: "Process name", varVal: processDataOfVariant.data.data.name },
      {
        varDet: "Process description",
        varVal: processDataOfVariant.data.data.description,
      },
      { varDet: "Variant Name", varVal: variantDataFromReducer.name },
      { varDet: "Apps involved", varVal: apps },
      {
        varDet: "Variant Created On",
        varVal: new Date(parsedData.count.created_on).toString().slice(0, -34),
      },
      { varDet: "Variant Max time", varVal: epochToHHMMSS(parsedData.count.max_time) },
      { varDet: "Variant Average Time", varVal: epochToHHMMSS(parsedData.count.avg_time) },
      { varDet: "Variant Coverage", varVal: parsedData.count.coverage },
      {
        varDet: "Variant Last run on",
        varVal: new Date(parsedData.count.last_run_on).toString().slice(0, -34),
      },
      {
        varDet: "Variant Number of runs",
        varVal: singleToDouble(parsedData.count.no_of_runs),
      },
      { varDet: "Variant Min time", varVal: epochToHHMMSS(parsedData.count.min_time) },
    ];

    arrData.forEach((item, index) => {
      metaSheet.addRow([item.varDet, item.varVal]);
      metaSheet.getCell(`A${index + 1}`).font = { bold: true };
    });

    metaSheet.properties.defaultColWidth = 40;

    // Generate Excel in memory
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert to File (NO DOWNLOAD)
    const excelFile = new File(
      [buffer],
      `${variantDataFromReducer.name}.xlsx`,
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    // Store for email attachment
    setSelectedFile(excelFile);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "SUCCESS",
        msg: "Excel generated and ready to send via email!",
        timeout: 3000,
      },
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });

  } catch (ex: any) {
    console.error(ex);
    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Unable to generate Excel",
        timeout: 3000,
      },
    });
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};

```

```ts
const generateDocument = async (type: string = "pdf") => {
  try {
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "Loading..." });

    const response: any = await ProcessService.get(
      variantData.processId,
      {
        generateDocument: true,
        documentType: type,
        repositoryId: variantDataFromReducer.id,
      },
      { responseType: "blob" }
    );

    // Backend already returns a Blob
    const pdfBlob = response.data;

    // Convert Blob → File (NO DOWNLOAD)
    const pdfFile = new File(
      [pdfBlob],
      `${variantDataFromReducer.name}.pdf`,
      {
        type: "application/pdf",
      }
    );

    // Store for email attachment
    setSelectedFile(pdfFile);

    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "SUCCESS",
        msg: "PDF generated and ready to send via email!",
        timeout: 3000,
      },
    });

    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });

  } catch (ex: any) {
    console.error(ex);
    dispatch({
      type: CALL_NOTIFY,
      payload: {
        type: "ERROR",
        msg: "Unable to generate PDF",
        timeout: 3000,
      },
    });
    dispatch({ type: SHOWSCREENBLOCKMSG, payload: "" });
  }
};

```