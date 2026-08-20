import * as XLSX from 'xlsx';
import { Account, Transaction, Profile } from '../types';
import { NEPALI_MONTHS } from './nepaliCalendar';

export interface MatrixRow {
  SN: number;
  Name: string;
  'Account No': string;
  [day: number]: number | string;
  Total: number;
}

export interface MatrixExportResult {
  data: MatrixRow[];
  agentName: string;
  monthYear: string;
  fileName: string;
  totalDeposit: number;
  memberCount: number;
}

/**
 * Transforms accounts and transaction collection records into a strict
 * 1-31 day monthly matrix matching the physical register and Excel files
 * (e.g. Bhajan Shrawan 2083.xlsx).
 */
export function transformToMonthlyMatrix(
  accounts: Account[],
  transactions: Transaction[],
  agent: Profile,
  monthIndex: number, // 1 to 12 (1 = Baisakh, 4 = Shrawan)
  year: number = 2083
): MatrixExportResult {
  const monthObj = NEPALI_MONTHS[monthIndex - 1] || NEPALI_MONTHS[3];
  const monthYearStr = `${monthObj.en} ${year}`;
  const daysInMonth = monthObj.days || 31;

  // 1. Filter accounts assigned to this agent (or all active if admin / unassigned)
  const agentAccounts = accounts.filter((acc) => {
    if (agent.role === 'admin') {
      return acc.status === 'active';
    }
    return acc.assigned_agent_id === agent.id && acc.status === 'active';
  });

  // Sort accounts naturally by Account Number (e.g., MKS-1001, MKS-1002...)
  const sortedAccounts = [...agentAccounts].sort((a, b) =>
    a.account_no.localeCompare(b.account_no, undefined, { numeric: true, sensitivity: 'base' })
  );

  // 2. Filter relevant transactions for this agent, month, and year
  const relevantTransactions = transactions.filter((tx) => {
    const matchAgent = agent.role === 'admin' || tx.agent_id === agent.id;
    // Check either month_year match or nepali_date format YYYY-MM-DD
    const txMonthNum = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[1], 10) : 0;
    const txYearNum = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[0], 10) : 0;
    
    const matchDate =
      tx.month_year === monthYearStr ||
      (txMonthNum === monthIndex && txYearNum === year);

    return matchAgent && matchDate;
  });

  // Group transaction amounts by account_id and day_number (1 to 31)
  // key: `${account_id}_${day_number}` -> amount
  const depositsMap = new Map<string, number>();

  relevantTransactions.forEach((tx) => {
    if (tx.type === 'deposit') {
      const key = `${tx.account_id}_${tx.day_number}`;
      const current = depositsMap.get(key) || 0;
      depositsMap.set(key, current + Number(tx.amount));
    }
  });

  let grandTotal = 0;

  // 3. Build Matrix Rows in exact order
  const matrixData: MatrixRow[] = sortedAccounts.map((account, index) => {
    const row: any = {
      SN: index + 1,
      Name: account.name,
      'Account No': account.account_no,
    };

    let rowTotal = 0;

    // Fill days 1 through 31
    for (let day = 1; day <= 31; day++) {
      if (day <= daysInMonth) {
        const depositAmt = depositsMap.get(`${account.id}_${day}`) || 0;
        row[day] = depositAmt > 0 ? depositAmt : 0.0;
        rowTotal += depositAmt;
      } else {
        row[day] = 0.0;
      }
    }

    row['Total'] = rowTotal;
    grandTotal += rowTotal;

    return row as MatrixRow;
  });

  // Dynamic file name pattern: [Agent_Name]_[Month_Year].xlsx
  const sanitizedAgentName = agent.full_name.trim().replace(/[/\\?%*:|"<>]/g, '');
  const fileName = `${sanitizedAgentName} ${monthYearStr}.xlsx`;

  return {
    data: matrixData,
    agentName: agent.full_name,
    monthYear: monthYearStr,
    fileName,
    totalDeposit: grandTotal,
    memberCount: matrixData.length,
  };
}

/**
 * Generates and downloads the Excel (.xlsx) file using SheetJS
 * Formats column widths, header titles, and number columns.
 */
export function exportMatrixToExcel(result: MatrixExportResult): void {
  const { data, fileName, agentName, monthYear, totalDeposit } = result;

  // 1. Create a new workbook
  const workbook = XLSX.utils.book_new();

  // 2. Prepare worksheet from JSON with exact headers
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 3. Add column width formatting for readability
  const colWidths: XLSX.ColInfo[] = [
    { wch: 6 },  // SN
    { wch: 24 }, // Name
    { wch: 14 }, // Account No
  ];

  // Width for day 1 through 31
  for (let i = 1; i <= 31; i++) {
    colWidths.push({ wch: 7 });
  }
  // Total column
  colWidths.push({ wch: 12 });

  worksheet['!cols'] = colWidths;

  // 4. Append a summary footer row at the bottom
  if (data.length > 0) {
    const summaryRow: any = {
      SN: '',
      Name: 'कुल जम्मा (GRAND TOTAL)',
      'Account No': '',
    };

    let calculatedGrandTotal = 0;
    for (let day = 1; day <= 31; day++) {
      let daySum = 0;
      data.forEach((r) => {
        const val = Number(r[day]) || 0;
        daySum += val;
      });
      summaryRow[day] = daySum > 0 ? daySum : 0.0;
      calculatedGrandTotal += daySum;
    }
    summaryRow['Total'] = calculatedGrandTotal || totalDeposit;

    XLSX.utils.sheet_add_json(worksheet, [summaryRow], {
      skipHeader: true,
      origin: -1, // Append at the end of the sheet
    });
  }

  // 5. Append sheet to workbook and trigger download
  const sheetName = monthYear.slice(0, 31); // Excel sheet names max 31 chars
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, fileName);
}
