# Kinship EHR -- Privacy Policy

**Effective Date:** April 3, 2026
**Last Updated:** April 3, 2026

This Privacy Policy describes how Stack Ritual LLC ("Company," "we," "us," or "our") collects, uses, stores, and protects information through the Kinship EHR platform ("Service") at kinshipehr.com. Stack Ritual LLC is a Delaware limited liability company (EIN: 41-5158692).

This policy applies to all users of the Service, including healthcare organization staff (clinicians, billing personnel, administrators) and patients who access the patient portal.

---

## 1. Information We Collect

### 1.1. Staff Account Information (Personally Identifiable Information)

When staff members register and use the Service, we collect:

- Full name
- Email address
- Phone number (if provided for SMS notifications)
- Job title and role within the organization
- Organization name and details
- Authentication credentials (managed by Clerk)
- Usage logs and activity within the Service (audit trail)

### 1.2. Protected Health Information (PHI)

Healthcare organizations using the Service enter patient data that constitutes PHI under HIPAA, including but not limited to:

- Patient demographics (name, date of birth, address, contact information)
- Clinical documentation (progress notes, assessments, treatment plans)
- Diagnoses and diagnostic codes
- Medication information
- Billing and insurance information
- Appointment and scheduling data
- Messages exchanged through the patient portal

**We process PHI solely on behalf of the Covered Entity (your healthcare organization) and in accordance with our Business Associate Agreement (BAA).**

### 1.3. Patient Portal Information

Patients who access the patient portal may provide:

- Login credentials (managed by Clerk)
- Messages sent to their care team through the portal

### 1.4. Payment Information

Subscription payments are processed by Stripe. We receive confirmation of payment status, subscription tier, and billing history. We do not store full credit card numbers, CVVs, or bank account details on our systems.

### 1.5. Automatically Collected Information

When you use the Service, we automatically collect:

- IP address
- Browser type and version
- Device type and operating system
- Pages visited and features used within the Service
- Timestamps of access and actions
- Referring URL

---

## 2. How We Use Information

### 2.1. Staff Account Information

We use staff account information to:

- Authenticate and authorize access to the Service
- Provide customer support
- Send service-related communications (account notifications, security alerts, billing updates)
- Maintain audit logs as required by HIPAA
- Improve and develop the Service
- Enforce our Terms of Service

### 2.2. Protected Health Information

We use PHI exclusively to:

- Provide the Service to your organization as described in the BAA
- Store and display clinical data as directed by authorized users
- Facilitate patient portal access
- Generate reports and analytics as requested by your organization
- Maintain audit trails as required by HIPAA
- Respond to lawful requests as required by applicable law

**We do not use PHI for marketing, advertising, or any purpose not authorized by the BAA and HIPAA.**

### 2.3. Automatically Collected Information

We use automatically collected information to:

- Maintain security and detect unauthorized access
- Monitor Service performance and reliability
- Analyze usage patterns to improve the Service
- Troubleshoot technical issues

---

## 3. Data Storage and Security

### 3.1. Infrastructure

The Service is hosted on the following United States-based infrastructure:

| Component | Provider | Purpose |
|-----------|----------|---------|
| Application hosting | Vercel | Serves the web application from US data centers |
| Database | Supabase | Stores all application data, including PHI, in PostgreSQL databases hosted in the US |
| Authentication | Clerk | Manages user identity, login sessions, and multi-factor authentication |

All data, including PHI, is stored within the United States.

### 3.2. Security Measures

We implement the following safeguards to protect your data:

- **Encryption in transit:** All data transmitted between your browser and our servers is encrypted using TLS 1.2 or higher.
- **Encryption at rest:** PHI and other sensitive data are encrypted at rest in our database.
- **Access controls:** Role-based access controls limit data access to authorized personnel. Multi-tenant architecture ensures organizations can only access their own data.
- **Authentication:** Multi-factor authentication is available through Clerk. Session management includes automatic timeout.
- **Audit logging:** All access to and modifications of PHI are logged with timestamps and user identification.
- **Workforce training:** Our personnel with access to production systems are trained on HIPAA requirements and data handling procedures.
- **Incident response:** We maintain an incident response plan for security events and potential breaches.

---

## 4. Third-Party Data Processors

We share information with the following third-party service providers, each of whom processes data on our behalf:

### 4.1. Clerk (Authentication)

- **Data shared:** Email address, name, authentication tokens, session data
- **Purpose:** User authentication, session management, multi-factor authentication
- **Website:** https://clerk.com

### 4.2. Supabase (Database)

- **Data shared:** All application data including PHI
- **Purpose:** Primary data storage and database services
- **Website:** https://supabase.com

### 4.3. Vercel (Hosting)

- **Data shared:** Application code, request/response data (which may include PHI in transit)
- **Purpose:** Application hosting, content delivery, serverless function execution
- **Website:** https://vercel.com

### 4.4. Stripe (Payments)

- **Data shared:** Organization name, billing contact email, payment method details, subscription tier
- **Purpose:** Subscription billing and payment processing
- **Website:** https://stripe.com
- **Note:** Stripe does not receive PHI.

### 4.5. Resend (Email)

- **Data shared:** Recipient email addresses, email content (which may include limited PHI such as appointment reminders or portal notifications)
- **Purpose:** Transactional email delivery (account notifications, password resets, clinical notifications)
- **Website:** https://resend.com

### 4.6. Twilio (SMS)

- **Data shared:** Recipient phone numbers, message content (which may include limited PHI such as appointment reminders)
- **Purpose:** SMS notifications and alerts
- **Website:** https://twilio.com

Where any third-party processor handles PHI, we maintain a Business Associate Agreement or equivalent contractual protections with that provider.

We do not sell, rent, or trade any personal information or PHI to third parties.

---

## 5. HIPAA Compliance

### 5.1. Our Role

Stack Ritual LLC acts as a Business Associate under HIPAA when processing PHI on behalf of healthcare organizations (Covered Entities) that use the Service.

### 5.2. Business Associate Agreement

We require a signed Business Associate Agreement (BAA) with every customer organization before PHI is entered into the Service. The BAA defines our obligations regarding the use, disclosure, and protection of PHI.

### 5.3. Minimum Necessary Standard

We apply the HIPAA minimum necessary standard, limiting our access to and use of PHI to the minimum amount needed to provide the Service.

### 5.4. Subcontractors

We ensure that any subcontractor that creates, receives, maintains, or transmits PHI on our behalf agrees to the same restrictions and conditions that apply to us under the BAA.

---

## 6. Data Retention

### 6.1. Active Accounts

We retain all Customer Data, including PHI, for as long as your subscription is active and as needed to provide the Service.

### 6.2. After Termination

Upon termination of your subscription:

- Customer Data (including PHI) remains available for export for 90 days.
- After the 90-day period, Customer Data is securely deleted from our production systems within 30 days.
- Backup copies are purged in accordance with our backup rotation schedule, not to exceed 180 days from termination.

### 6.3. Audit Logs

Audit logs related to PHI access and modifications are retained for a minimum of 6 years from the date of creation, as required by HIPAA.

### 6.4. Legal Obligations

We may retain data beyond the periods stated above if required by law, regulation, or legal proceedings.

---

## 7. Patient Rights Under HIPAA

If you are a patient accessing the patient portal, the following rights are managed by your healthcare provider (the Covered Entity), not by Kinship EHR directly. However, we support your provider in fulfilling these obligations:

- **Right of Access:** You have the right to access your PHI. The patient portal provides read-only access to your clinical data.
- **Right to Request Amendment:** You may request that your provider amend your PHI. Contact your provider directly to make this request.
- **Right to an Accounting of Disclosures:** You may request an accounting of certain disclosures of your PHI. Contact your provider to make this request.
- **Right to Request Restrictions:** You may request restrictions on certain uses and disclosures of your PHI. Contact your provider directly.
- **Right to Receive Breach Notification:** You have the right to be notified if your unsecured PHI is breached. See Section 8 below.

To exercise any of these rights, contact your healthcare provider directly. If you need to reach us for technical questions about the patient portal, email hello@kinshipehr.com.

---

## 8. Breach Notification

### 8.1. Our Obligations

In the event of a breach of unsecured PHI, we will:

1. Notify the affected Covered Entity (your healthcare organization) without unreasonable delay and no later than 60 days after discovery of the breach.
2. Provide all information required under 45 CFR 164.410, including the nature of the breach, types of information involved, and steps taken to mitigate harm.
3. Cooperate with the Covered Entity in its breach notification obligations to affected individuals and the Department of Health and Human Services (HHS).

### 8.2. Your Obligations

As the Covered Entity, you are responsible for notifying affected individuals and HHS as required by HIPAA. We will assist you in this process as specified in the BAA.

### 8.3. Security Incident Reporting

If you become aware of a suspected security incident involving the Service, report it immediately to hello@kinshipehr.com.

---

## 9. Cookies and Tracking Technologies

### 9.1. Essential Cookies

The Service uses essential cookies for:

- Authentication session management (via Clerk)
- Security tokens (CSRF protection)
- User preferences (language, timezone)

These cookies are strictly necessary for the Service to function and cannot be disabled.

### 9.2. Analytics

We may use privacy-respecting analytics to understand how the Service is used. We do not use analytics tools that track users across third-party websites. Analytics data is aggregated and does not include PHI.

### 9.3. No Advertising Cookies

We do not use advertising cookies, tracking pixels, or any technology that shares data with advertising networks.

---

## 10. Communications

### 10.1. Service Communications

We may send you service-related communications, including:

- Security alerts and breach notifications
- Account and billing notifications
- Service updates and scheduled maintenance notices
- Responses to support inquiries

These communications are not marketing and cannot be opted out of while you maintain an active account.

### 10.2. Marketing Communications

We may occasionally send product update emails. You may opt out of marketing communications at any time by using the unsubscribe link in the email or by contacting us at hello@kinshipehr.com.

---

## 11. Children's Privacy

The Service is designed for use by healthcare professionals and adult patients. We do not knowingly collect personal information from children under 13. If a minor's PHI is entered into the Service, it is entered by the healthcare organization as part of its treatment relationship and is governed by HIPAA, not COPPA.

---

## 12. State Privacy Laws

In addition to HIPAA, we comply with applicable state privacy laws. If you are a California resident, you may have additional rights under the California Consumer Privacy Act (CCPA). However, PHI that is subject to HIPAA is exempt from CCPA. For questions about state-specific privacy rights, contact us at hello@kinshipehr.com.

---

## 13. International Users

The Service is hosted in the United States and is intended for use by healthcare organizations operating in the United States. If you access the Service from outside the United States, you acknowledge that your data will be transferred to and processed in the United States.

---

## 14. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify users of material changes by:

- Posting a notice within the Service
- Sending an email to the address associated with your account
- Updating the "Last Updated" date at the top of this policy

Material changes take effect 30 days after notification. Continued use of the Service after the effective date constitutes acceptance of the updated policy.

---

## 15. Contact Information

For questions, concerns, or requests related to this Privacy Policy or our data practices, contact us at:

**Stack Ritual LLC**
Email: hello@kinshipehr.com
Website: https://kinshipehr.com

For HIPAA-related inquiries or to report a potential security incident, email hello@kinshipehr.com with the subject line "HIPAA Inquiry" or "Security Incident."

---

## 16. Acknowledgment

By using the Service, you acknowledge that you have read and understood this Privacy Policy. If you are a healthcare organization, you further acknowledge your responsibilities as a Covered Entity under HIPAA and the importance of executing a Business Associate Agreement with us before entering PHI into the Service.
