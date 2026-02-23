import type { Message } from 'ollama';
import { config } from '../config';

const { splittingSymbol } = config;

const SEMANTIC_SPLITTER_INTRUCT: Message = {
  role: 'system',
  content: `
    Your task is to segment the following text (i.e. user input such as plain prose, bullet points or listings) into semantically independent parts.
    Do not add, remove, or modify any words - under no circumstances should you ever add any additional text, comments, or explanations.
    Preserve the original ordering of words within each group — but groups themselves need not follow the original sequence.
    Separate each group only by the delimiter
    ${splittingSymbol}
    (i.e. exactly as shown, on a line by themselves, no additional whitespaces, just '${splittingSymbol}').
    If the entire input is already one coherent semantic unit, return it verbatim without any delimiter.
    Grouping need do not be adjacent - just semantically related (i.e. two related text parts might be separated by other text parts).
    If the input is empty, return an empty string.
    If the input is a single word, return it verbatim without any delimiter.
    If the input is a single sentence, return it verbatim without any delimiter.
    If you are unsure about the grouping, return the entire input as a single group without any delimiters.
    Under no circumstances should you ever add any additional text, comments, or explanations.
    `,
};
const SEMANTIC_SPLITTER_EXAMPLES: Message[] = [
  {
    role: 'user',
    content: `
        The job requires welding experience. Tick welding would be preferable if the person is familiar with it. The cage is designed for small pets like rabbits. Therefore, it must not contain any sharp edges that could harm them. Experience with welding small wires could be beneficial.
    `,
  },
  {
    role: 'assistant',
    content: `
        The job requires welding experience. Tick welding would be preferable if the person is familiar with it. Experience with welding small wires could be beneficial.
        ${splittingSymbol}
        The cage is designed for small pets like rabbits. Therefore, it must not contain any sharp edges that could harm them.
    `,
  },
  {
    role: 'user',
    content: `
        - Assemble circuit boards according to schematic diagrams
        - Test each board for continuity and signal integrity
        - Package finished units in protective casing
        - Ship completed orders to customers worldwide
    `,
  },
  {
    role: 'assistant',
    content: `
        - Assemble circuit boards according to schematic diagrams
        - Test each board for continuity and signal integrity
        ${splittingSymbol}
        - Package finished units in protective casing
        - Ship completed orders to customers worldwide
    `,
  },
  {
    role: 'user',
    content: `
        1. Prepare raw materials for production
        2. Record daily output and machine performance.
        3. Clean workstations and restock supplies
        4. Order order new materials when needed.
        5. Calibrate and maintain measurement instruments.
    `,
  },
  {
    role: 'assistant',
    content: `
        1. Prepare raw materials for production
        4. Order order new materials when needed.
        ${splittingSymbol}
        2. Record daily output and machine performance.
        ${splittingSymbol}
        3. Clean workstations and restock supplies
        ${splittingSymbol}
        5. Calibrate and maintain measurement instruments.
    `,
  },
  {
    role: 'user',
    content: `
        Operate CNC milling machines to produce precision metal parts. Perform quality inspections using calipers, micrometers, and gauges. Monitor machine operation and adjust feed rates, speeds, and tooling as needed. Maintain a clean and safe workspace, following all OSHA safety guidelines. Collaborate with engineers to troubleshoot design issues and implement improvements. Document production logs, inspection reports, and maintenance records daily. Assist in training new operators on standard operating procedures and best practices.
    `,
  },
  {
    role: 'assistant',
    content: `
        Operate CNC milling machines to produce precision metal parts.
        Monitor machine operation and adjust feed rates, speeds, and tooling as needed.
        ${splittingSymbol}
        Perform quality inspections using calipers, micrometers, and gauges.
        Collaborate with engineers to troubleshoot design issues and implement improvements.
        ${splittingSymbol}
        Maintain a clean and safe workspace, following all OSHA safety guidelines.
        Document production logs, inspection reports, and maintenance records daily.
        Assist in training new operators on standard operating procedures and best practices.
    `,
  },
];

export const SEMANTIC_SPLITTER: Message[] = [
  SEMANTIC_SPLITTER_INTRUCT,
  ...SEMANTIC_SPLITTER_EXAMPLES,
];

/**
 * -------------------------------------------------------------
 */

// const MATCH_REASON_INTRUCT: Message = {
//   role: 'system',
//   content: `
//     You are an expert in generating reasons for matching scores between tasks and competences.
//     Your task is to generate a reason for the matching score between a task and a competence.
//     The reason should be one to three short, concise sentence that explain why the task and competence match as well as they did or why they did not match that well.
//     Do not mention the similarity score in your response.
//     The reason should be based on the text of the task and the competence and their estimated normalized similarity score.
//     The similarity score is a number between 0 and 1, where 0 means no similarity and 1 means perfect similarity.
//     Do not mention the similarity score in your response.
//     `,
// };

// const MATCH_REASON_EXAMPLES: Message[] = [
//   {
//     role: 'user',
//     content: `
//         Task: Operate CNC milling machines to produce precision metal parts.
//         Competence: Experience with CNC milling machines and precision machining.
//         Similarity Score: 0.95
//     `,
//   },
//   {
//     role: 'assistant',
//     content: `
//         The statements match very well because the task requires operating CNC milling machines, which is exactly what the competence is about.
//     `,
//   },
//   {
//     role: 'user',
//     content: `
//         Task: Assemble circuit boards according to schematic diagrams.
//         Competence: Basic knowledge of electronics and soldering skills.
//         Similarity Score: 0.65
//     `,
//   },
//   {
//     role: 'assistant',
//     content: `
//         The the statements have a moderate match because while assembling circuit boards requires some knowledge of electronics, it does not specifically require advanced soldering skills.
//     `,
//   },
//   {
//     role: 'user',
//     content: `
//         Task: Prepare raw materials for production.
//         Competence: Experience with inventory management and supply chain logistics.
//         Similarity Score: 0.30
//     `,
//   },
//   {
//     role: 'assistant',
//     content: `
//         The statements have a low match because preparing raw materials is a basic task that does not require advanced inventory management or supply chain logistics skills.
//     `,
//   },
// ];

let MATCH_REASON_EXAMPLES: Message[] = [
  {
    role: 'user',
    content: `
        Task: Operate CNC milling machines to produce precision metal parts.
        Competence: Experience with CNC milling machines and precision machining.
        Similarity Score: 0.91
        Alignment: aligning
    `,
  },
  {
    role: 'assistant',
    content: `
        The statements match very well because the task requires operating CNC milling machines, which is exactly what the competence is about.
    `,
  },
  {
    role: 'user',
    content: `
        Task: Delivering packages to customers on time. Driving a delivery van safely through city traffic. Loading and unloading packages efficiently. Communicating with customers professionally. Planning optimal delivery routes using GPS technology.
        Competence: Has no drivers license and cannot operate vehicles.
        Similarity Score: 0.0
        Alignment: contradicting
    `,
  },
  {
    role: 'assistant',
    content: `
        The statements do not match. The task requires driving a delivery van, but the competence indicates that the person cannot operate vehicles at all.
    `,
  },
  {
    role: 'user',
    content: `
        Task: Assemble circuit boards according to schematic diagrams.
        Competence: Basic knowledge of electronics and soldering skills.
        Similarity Score: 0.18
        Alignment: neutral
    `,
  },
  {
    role: 'assistant',
    content: `
        The the statements only slightly match because while assembling circuit boards requires some knowledge of electronics, it does not specifically require advanced soldering skills.
    `,
  },
  {
    role: 'user',
    content: `
        Task: Prepare raw materials for production.
        Competence: Experience with inventory management and supply chain logistics.
        Similarity Score: 0
        Alignment: neutral
    `,
  },
  {
    role: 'assistant',
    content: `
        The task and competence do not match because preparing raw materials is a basic task that does not require advanced inventory management or supply chain logistics skills.
    `,
  },
  ////////////////////////////////////////////////////////////////
  {
    role: 'user',
    content: `
    Task: Lead Agile Scrum teams, facilitate sprint planning and retrospectives.
    Competence: Certified Scrum Master with 5 years of experience running scrum ceremonies.
    Similarity Score: 0.95
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence directly covers leading Scrum teams and facilitating ceremonies, which matches the task's requirements precisely.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Develop native iOS applications in Swift and ship to the App Store.
    Competence: Experienced Android engineer, Kotlin and Jetpack Compose.
    Similarity Score: 0.40
    Alignment: neutral
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence demonstrates mobile-app development experience but on a different platform and language, so it provides some transferable skills but not a direct match.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Translate legal contracts from English to German ensuring legal terminology is correct.
    Competence: Native German translator with certification in legal translation.
    Similarity Score: 0.92
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence combines native German proficiency with a legal translation credential, matching the task's need for accurate legal terminology.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Manage payroll, calculate taxes, and file payroll reports.
    Competence: Certified public accountant (CPA) with payroll processing experience.
    Similarity Score: 0.89
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence includes both the certification and hands-on payroll experience required to perform payroll calculation and filings.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Operate hydraulic excavators on construction sites.
    Competence: Forklift operator certified with several years of warehouse experience.
    Similarity Score: 0.12
    Alignment: neutral
  `,
  },
  {
    role: 'assistant',
    content: `
    Both roles involve operating heavy equipment, but the specific machinery and skills differ, so the relevance is limited.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Write unit tests in Python using pytest and maintain test coverage.
    Competence: Experienced in writing unit tests in Java with JUnit and some general testing knowledge.
    Similarity Score: 0.45
    Alignment: neutral
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence shows solid testing experience but in a different language and framework, making it partly relevant but not a perfect fit.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Handle inbound customer support calls with empathy and problem resolution.
    Competence: Strong written communication skills and two years of live chat customer support.
    Similarity Score: 0.55
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence demonstrates customer-facing communication and support experience that transfers well to voice support, though the channel differs.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Perform blood draws (phlebotomy) and prepare specimens for lab testing.
    Competence: Certified phlebotomist with clinical experience.
    Similarity Score: 0.99
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence explicitly covers phlebotomy certification and clinical practice, which directly matches the task's duties.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Conduct workplace hazard assessments and maintain safety documentation.
    Competence: OSHA 30 certification and experience conducting safety audits.
    Similarity Score: 0.87
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence shows the required safety certification and audit experience needed to perform hazard assessments and documentation.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Build high-frequency trading systems in low-latency C++.
    Competence: Strong Python data-analysis background and finance domain knowledge.
    Similarity Score: 0.30
    Alignment: neutral
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence provides valuable finance and data skills, but lacks the specific low-latency C++ systems expertise required for the task.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Lead a team of graphic designers to create brand identity and assets.
    Competence: Senior UX designer with a portfolio of visual branding and team leadership.
    Similarity Score: 0.70
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence combines visual branding experience and leadership, which fits the task of leading designers to create brand assets.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Translate complex medical research articles accurately into English.
    Competence: Marketing copywriter with no medical background.
    Similarity Score: 0.0
    Alignment: contradicting
  `,
  },
  {
    role: 'assistant',
    content: `
    The task requires specialized medical knowledge and terminology that the competence does not provide.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Ensure PCI-level data protection and handle cardholder data securely.
    Competence: History of incidents involving mishandling of sensitive customer data.
    Similarity Score: 0.0
    Alignment: contradicting
  `,
  },
  {
    role: 'assistant',
    content: `
    The task requires strict data security practices, but the competence indicates past failures to protect sensitive information, creating a direct conflict.
  `,
  },
  ///////////////////////
  {
    role: 'user',
    content: `
    Task: Install and configure Nginx as a reverse proxy with TLS termination for multiple web services.
    Competence: Experience configuring Nginx, handling TLS certificates, and reverse proxy setups for web applications.
    Similarity Score: 0.92
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence explicitly covers Nginx configuration, TLS certificate handling, and reverse-proxy setups, which directly match the task. That operational experience maps to the task's technical requirements. Overall this is a strong, practical fit.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Write automated end-to-end tests for a React web application using Playwright.
    Competence: Experienced in unit/integration testing in React and in end-to-end tests using Selenium.
    Similarity Score: 0.63
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence shows solid testing experience and familiarity with React, which transfers to end-to-end testing concepts. While the specific test framework differs and Selenium's patterns are not identical to Playwright's modern APIs, the fit is definitely relevant although not a perfect match.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Manage emergency room triage, including rapid patient assessment and prioritization.
    Competence: Registered nurse with prior ER triage experience and ACLS certification.
    Similarity Score: 1
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence explicitly describes ER triage experience and advanced life support certification, which match the task's clinical and triage responsibilities. Those credentials and practical duties map directly to rapid patient assessment and prioritization. This competence is therefore highly appropriate for the role.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Operate retail point-of-sale (POS) systems and handle daily cash reconciliation.
    Competence: Previous retail cashier experience including operating POS terminals and performing end-of-day cash counts.
    Similarity Score: 0.74
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence lists the exact operational duties — running POS systems and reconciling cash — which align with the task. That hands-on experience covers most daily requirements and reduces training needs. Overall the candidate is well suited for this role.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Ensure GDPR-compliant handling of personal data, manage consent records, and perform regular data protection impact assessments.
    Competence: Proven track record implementing data protection policies and running DPIAs.
    Similarity Score: 0.81
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence demonstrates direct experience implementing data-protection policies and performing impact assessments, which correspond to the task's key responsibilities. Those policy and assessment skills indicate strong familiarity with GDPR-related workflows and controls. The competence is therefore a very good fit for the task.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Drive a passenger shuttle daily and secure vehicle inspections.
    Competence: Medical restriction explicitly prohibiting driving.
    Similarity Score: 0.00
    Alignment: contradicting
  `,
  },
  {
    role: 'assistant',
    content: `
    The task requires driving a passenger shuttle, but the competence indicates a medical restriction against driving, creating a direct conflict.
  `,
  },
  /////////////////
  {
    role: 'user',
    content: `
    Task: Translate engineering user manuals from Chinese to English, preserving technical terms and measurements.
    Competence: Professional Chinese-to-English translator with experience in marketing and legal documents, no engineering background.
    Similarity Score: 0.79
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence demonstrates strong translation skills between Chinese and English, which are essential for the task. However, the lack of engineering-specific experience means some technical terminology may require additional research. Overall, the candidate is quite well suited but may need to upskill on engineering concepts.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Administer Microsoft SQL Server databases, tune queries and manage backups.
    Competence: Extensive experience with MySQL and PostgreSQL administration.
    Similarity Score: 0.45
    Alignment: neutral
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence shows strong database administration skills that transfer conceptually to SQL Server. However, the specific platform differences mean the candidate will need to learn SQL Server's unique features and tools. The fit is partial: good foundational skills but not yet complete for SQL Server-specific tasks.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Improve front-end performance for a React single-page app, including code-splitting and profiling render hotspots.
    Competence: Experienced React developer who has optimized bundle sizes and refactored components but limited experience with advanced profiler workflows.
    Similarity Score: 0.50
    Alignment: neutral
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence brings directly relevant front-end and React experience, including bundle optimization and component improvements. However, the candidate's limited exposure to advanced profiling workflows means they may need to upskill for deep-render hotspot analysis. Overall, they are reasonably well placed to improve performance but may require some additional profiling experience.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Build SQL analytics queries and ETL jobs in Amazon Redshift, optimize for large datasets.
    Competence: Strong SQL and analytics experience with PostgreSQL and routine ETL pipelines, but no Redshift-specific deployments.
    Similarity Score: 0.52
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence demonstrates solid SQL and ETL experience that transfers to analytics work, and understanding of query design is directly useful for Redshift. The lack of Redshift-specific tuning and cluster knowledge is a remaining gap that will affect large-scale optimizations. The candidate is generally well suited but will need platform-specific tuning skills.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Onboard mid-market customers to a SaaS product and drive adoption through structured training and playbooks.
    Competence: Account manager with experience in customer onboarding for software services, but mostly for on-premise deployments and manual training sessions.
    Similarity Score: 0.48
    Alignment: neutral
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence shows relevant onboarding and customer engagement experience that transfers to SaaS adoption activities. However, the difference between on-premise manual onboarding and recurring SaaS flows means playbook-driven, product-led onboarding skills may be missing. The candidate can perform many onboarding tasks but will need to adapt to SaaS-specific tooling and processes.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Deploy machine-learning models to production with CI/CD, containerization, and monitoring.
    Competence: ML researcher experienced in model development and validation, with limited DevOps/infrastructure deployment experience.
    Similarity Score: 0.47
    Alignment: neutral
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence demonstrates strong machine-learning model development skills, which are foundational for production deployment. However, the lack of DevOps and infrastructure experience means the candidate may struggle with CI/CD pipelines, containerization, and monitoring aspects. The fit is partial: good ML skills but significant gaps in deployment expertise.
  `,
  },
  {
    role: 'user',
    content: `
    Task: Provide German-language phone-based customer support for technical B2B software.
    Competence: Native German speaker with one year of live chat support experience on a technical product.
    Similarity Score: 0.55
    Alignment: aligning
  `,
  },
  {
    role: 'assistant',
    content: `
    The competence supplies native-level language skills and hands-on technical support experience, which transfer well to customer-facing roles. Phone-based support requires real-time verbal communication and some nuances compared with chat, but the underlying technical troubleshooting ability is present. Overall this competence is a good fit, with small channel-specific adaptation required.
  `,
  },
];

// Add intermediate system instructions for more consistent reasoning
const systemIntermezzo: Message = {
  role: 'system',
  content: `
        Remember to base your reason on both the similarity score and the alignment label without mentioning them explicitly.
        Scores above 0.6 generally indicate a good up to perfect suitability.
        Scores between 0.45 and 0.6 generally indicate some up to a good degree of suitability.
        Scores between 0.25 and 0.45 generally indicate some degree of suitability.
        Scores below or equal to 0.25 generally indicate little to no suitability.
    `,
};

// Add after every assistant message
MATCH_REASON_EXAMPLES = MATCH_REASON_EXAMPLES.flatMap((msg) =>
  msg.role === 'assistant' ? [msg, systemIntermezzo] : [msg],
);

const MATCH_REASON_INSTRUCT: Message = {
  role: 'system',
  content: `
You are an expert in generating concise reasons that explain why a Task and a Competence match to the degree they do.

Core rules:
- Produce exactly 1–3 short, concise sentences that explain why the task and competence matched (or did not). Use active voice and concrete wording.
- Base the reason only on the text of the Task and the Competence and implicitly on the provided similarity score and alignment label. Do NOT invent facts.
- Do NOT mention the numeric similarity score or the alignment label in the reason.
- Avoid speculation, generic filler, or unrelated information. Keep reasons grounded in wording present in the two texts.
- If texts explicitly conflict (for example, task requires driving and competence states inability to drive), explain the conflict clearly and directly without naming the label.
- When the texts imply partial transferability (different platform/language/tool but overlapping concepts), explain which parts transfer and which gaps remain.
- Keep tone neutral and factual.

Score interpretation (matches your semantics):
- 0.00 : Not suited — no suitability (either direct contradiction or no overlap).
- Greater than 0 up to 0.20 (0 < score ≤ 0.20) : Slightly suited — small degree of relevance or very limited transferability.
- Greater than 0.20 up to 0.50 (0.20 < score ≤ 0.50) : Somewhat suited — a noticeable but incomplete overlap; useful for partial tasks or with training.
- Greater than 0.50 up to 0.70 (0.50 < score ≤ 0.70) : Quite well suited — competence covers most requirements with small gaps.
- Greater than 0.70 up to 0.85 (0.70 < score ≤ 0.85) : Very well suited — strong coverage of task requirements.
- Greater than 0.85 up to 1.00 (0.85 < score ≤ 1.00) : Close to perfectly suited — competence largely or fully covers the task.

Important handling of inconsistencies:
- If the numeric score and the alignment label conflict (for example, a nonzero high score but an alignment that indicates explicit contradiction), prefer the alignment label when the competence text clearly contradicts the task. In that case, produce a reason that highlights the explicit conflicting statements in the texts.
- Otherwise, use the score and label implicitly to set the tone and specificity of the reason.

Output constraints:
- 1–3 short sentences only.
- Do NOT include numeric values or alignment labels in the output.
- Be specific: reference the precise skill, tool, domain, or limitation that explains the match degree.
`,
};

export const MATCH_REASON: Message[] = [MATCH_REASON_INSTRUCT, ...MATCH_REASON_EXAMPLES];

/**
 * -------------------------------------------------------------
 */
// """"""""""
// The warehouse must maintain ambient temperatures between 15°C and 25°C to protect sensitive goods. Humidity levels should not exceed 60% to prevent corrosion and mold growth. Inventory audits are scheduled weekly to ensure accuracy and compliance with safety standards.
// """"""""""

// """"""""""
// Our catering service provides vegetarian, vegan, and gluten-free menu options to accommodate diverse dietary needs. All dishes are prepared fresh daily using locally sourced ingredients whenever possible. Orders must be placed at least 48 hours in advance to guarantee availability. Delivery times range from 8 AM to 6 PM on weekdays.
// """"""""""

// """"""""""
// Employees are required to complete the annual cybersecurity training module before accessing the new intranet portal. The module covers password hygiene, phishing identification, and secure remote-access procedures. Failure to complete training by the deadline will result in temporary revocation of network privileges.
// """"""""""

// """"""""""
// The production line must operate continuously in three shifts—morning, afternoon, and night—to meet daily target outputs of 5,000 units. All machinery, including conveyor belts and hydraulic presses, requires a thorough safety inspection at the start of each shift to ensure proper lubrication and guard alignment. Operators are responsible for logging any unusual vibrations, noise anomalies, or temperature spikes immediately in the maintenance ledger. Raw material deliveries arrive twice weekly and must be verified against purchase orders for quantity, grade, and certificate of analysis before being released to the staging area. Finished goods undergo a final quality check where dimensional tolerances, surface finish, and functional performance are recorded. Any nonconforming parts are quarantined and tagged, then reported to quality assurance for root‐cause analysis. At the end of each month, team leads compile production metrics, downtime reasons, and scrap rates into a summarized report for review at the management safety and efficiency meeting.
// """"""""""
