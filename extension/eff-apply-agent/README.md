# EFF Apply Agent

Student-controlled Manifest V3 browser extension prototype. It stores a small reusable profile in the student's local browser, detects common application fields, fills only blank supported fields, highlights every change, and never submits a form.

## Safety boundaries

- HTTPS pages only.
- Never fills passwords, OTPs, CAPTCHA, signatures, SSNs, or financial/payment fields.
- Never clicks Submit.
- Never invents an answer.
- Route coverage must be verified before EFF describes a school as supported.

## Local installation

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this directory. Production distribution requires Chrome Web Store review and signed release packaging.
