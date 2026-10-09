/**
 * =========================================================================
 * HRHUB ENTERPRISE MEMO & PDF EMAIL DISPATCHER
 * Google Apps Script Webhook (Deploy as Web App)
 * Target Sender: imsoroglohr@gmail.com (or your HR Google Account)
 * =========================================================================
 * 
 * INSTRUCTIONS TO DEPLOY:
 * 1. Open Google Sheets / Google Drive or go to https://script.google.com
 * 2. Click "New Project" and name it "HRHub Memo Dispatcher".
 * 3. Replace all code in Code.gs with this exact script.
 * 4. Click "Deploy" -> "New deployment" -> Select type: "Web app".
 * 5. Set:
 *    - Description: "HRHub Official Memo & PDF Dispatcher"
 *    - Execute as: "Me" (your email: imsoroglohr@gmail.com)
 *    - Who has access: "Anyone" (allows HRHub app to trigger dispatch)
 * 6. Click "Deploy", Authorize access with your Google account.
 * 7. Copy the "Web app URL" (starts with https://script.google.com/macros/s/...)
 * 8. Paste the Web app URL in HRHub Memo Generator -> Webhook URL.
 * =========================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No POST payload received from HRHub."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var results = [];

    // Supports company-segregated multi-dispatch array
    var dispatches = payload.dispatches || [payload];

    for (var i = 0; i < dispatches.length; i++) {
      var item = dispatches[i];
      var recipients = item.recipients || [];
      if (!Array.isArray(recipients)) {
        recipients = [recipients];
      }

      // Filter valid email addresses
      var validRecipients = recipients.filter(function(email) {
        return email && typeof email === "string" && email.indexOf("@") > 0;
      });

      if (validRecipients.length === 0) {
        results.push({
          company: item.companyName || "Unknown",
          memoRef: item.memoRef || "N/A",
          status: "skipped",
          message: "No recipient emails for this entity."
        });
        continue;
      }

      var companyName = item.companyName || "Simpal Group of Companies";
      var memoRef = item.memoRef || "MEMO-2026-HR";
      var subject = item.subject || ("[OFFICIAL MEMO] " + memoRef + " - " + companyName);
      var htmlBody = item.htmlBody || "<p>Please find attached your official memorandum.</p>";
      var plainBody = item.body || "Please find attached your official memorandum from Human Resources.";
      var senderEmail = item.senderEmail || "imsoroglohr@gmail.com";

      // 1. Generate High-Quality PDF Attachment for this specific company
      var attachments = [];
      var pdfHtml = item.pdfHtml || item.htmlBody;

      if (pdfHtml) {
        try {
          var paperSize = item.paperSize || (item.isLongPaper ? "8.5in 13in" : "A4 portrait");
          var pageMargin = item.isLongPaper ? "2mm 5mm 3mm 5mm" : "3mm 6mm 4mm 6mm";
          var cleanHtmlForPdf = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                @page { 
                  size: ${paperSize}; 
                  margin: ${pageMargin}; 
                }
                * { 
                  box-sizing: border-box; 
                  -webkit-print-color-adjust: exact; 
                  print-color-adjust: exact; 
                }
                html, body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; 
                  color: #0f172a; 
                  background-color: #ffffff; 
                  margin: 0; 
                  padding: 0; 
                  line-height: 1.5; 
                }
                div, table {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
              </style>
            </head>
            <body>
              ${pdfHtml}
            </body>
            </html>
          `;

          var pdfBlob = Utilities.newBlob(cleanHtmlForPdf, "text/html", memoRef + ".html")
            .getAs("application/pdf")
            .setName(memoRef + " - " + companyName + ".pdf");
          attachments.push(pdfBlob);
        } catch (pdfErr) {
          Logger.log("PDF Generation warning: " + pdfErr.toString());
        }
      }

      // 2. Dispatch to each company employee with company-specific PDF
      var sentEmails = [];
      for (var r = 0; r < validRecipients.length; r++) {
        var recipientEmail = validRecipients[r].trim();
        try {
          GmailApp.sendEmail(recipientEmail, subject, plainBody, {
            htmlBody: htmlBody,
            attachments: attachments,
            name: "HRHub Official Dispatch • " + companyName,
            replyTo: senderEmail
          });
          sentEmails.push(recipientEmail);
        } catch (sendErr) {
          Logger.log("Failed to send to " + recipientEmail + ": " + sendErr.toString());
        }
      }

      results.push({
        company: companyName,
        memoRef: memoRef,
        targetRecipients: validRecipients.length,
        sentCount: sentEmails.length,
        recipients: sentEmails,
        pdfAttached: attachments.length > 0,
        status: sentEmails.length > 0 ? "success" : "failed"
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      dispatchedAt: new Date().toISOString(),
      results: results
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (globalErr) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: globalErr.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "HRHub Memo & PDF Dispatcher Webhook",
    ready: true,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
