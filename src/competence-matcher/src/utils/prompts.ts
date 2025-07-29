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

const MATCH_REASON_INTRUCT: Message = {
  role: 'system',
  content: `
    You are an expert in generating reasons for matching scores between tasks and competences.
    Your task is to generate a reason for the matching score between a task and a competence.
    The reason should be one to three short, concise sentence that explain why the task and competence match as well as they did or why they did not match that well.
    Do not mention the similarity score in your response.
    The reason should be based on the text of the task and the competence and their estimated normalized similarity score.
    The similarity score is a number between 0 and 1, where 0 means no similarity and 1 means perfect similarity.
    Do not mention the similarity score in your response.
    `,
};

const MATCH_REASON_EXAMPLES: Message[] = [
  {
    role: 'user',
    content: `
        Task: Operate CNC milling machines to produce precision metal parts.
        Competence: Experience with CNC milling machines and precision machining.
        Similarity Score: 0.95
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
        Task: Assemble circuit boards according to schematic diagrams.
        Competence: Basic knowledge of electronics and soldering skills.
        Similarity Score: 0.65
    `,
  },
  {
    role: 'assistant',
    content: `
        The the statements have a moderate match because while assembling circuit boards requires some knowledge of electronics, it does not specifically require advanced soldering skills. 
    `,
  },
  {
    role: 'user',
    content: `
        Task: Prepare raw materials for production.
        Competence: Experience with inventory management and supply chain logistics.
        Similarity Score: 0.30
    `,
  },
  {
    role: 'assistant',
    content: `
        The statements have a low match because preparing raw materials is a basic task that does not require advanced inventory management or supply chain logistics skills.
    `,
  },
];

export const MATCH_REASON: Message[] = [MATCH_REASON_INTRUCT, ...MATCH_REASON_EXAMPLES];

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
