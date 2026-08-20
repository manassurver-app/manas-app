import * as XLSX from 'xlsx';
import { Account, Transaction, Profile } from '../types';
import { formatBSToNepaliDate, NEPALI_MONTHS } from './nepaliCalendar';

export function exportDailyCollectionSheetToExcel(
  accounts: Account[],
  transactions: Transaction[],
  agent: Profile,
  nepaliDateBS: string,
  monthYear: string
) {
  // Map transactions of the day by account id
  const dailyTxMap: Record<string, { deposit: number; withdrawal: number }> = {};
  transactions
    .filter((tx) => tx.nepali_date === nepaliDateBS && (agent.role === 'admin' || tx.agent_id === agent.id))
    .forEach((tx) => {
      if (!dailyTxMap[tx.account_id]) {
        dailyTxMap[tx.account_id] = { deposit: 0, withdrawal: 0 };
      }
      if (tx.type === 'deposit') {
        dailyTxMap[tx.account_id].deposit += Number(tx.amount);
      } else {
        dailyTxMap[tx.account_id].withdrawal += Number(tx.amount);
      }
    });

  const rows: any[] = [];

  // Organization Header
  rows.push(['मानस कृषि सहकारी संस्था लिमिटेड (Manas Krishi Sahakari Limited)']);
  rows.push(['टिकापुर-१, कैलाली, सुदूरपश्चिम प्रदेश, नेपाल (Tikapur-1, Kailali, Nepal)']);
  rows.push(['दैनिक बचत संकलन खाता (Daily Field Collection Ledger)']);
  rows.push([]);
  rows.push([
    `बजार प्रतिनिधि (Collector): ${agent.full_name}`,
    '',
    `मिति (BS Date): ${nepaliDateBS} (${formatBSToNepaliDate(nepaliDateBS)})`,
    '',
    `महिना (Month): ${monthYear}`,
  ]);
  rows.push([]);

  // Column Headers
  rows.push([
    'क्र.सं. (S.N.)',
    'खाता नं. (A/C No.)',
    'सदस्यको नाम (Member Name)',
    'ठेगाना (Address)',
    'सम्पर्क नं. (Contact)',
    'आजको जम्मा रु. (Deposit)',
    'आजको भुक्तानी रु. (Withdrawal)',
    'हालको मौज्दात रु. (Balance)',
    'सदस्यको दस्तखत (Signature)',
  ]);

  let totalDeposit = 0;
  let totalWithdrawal = 0;
  let totalBalance = 0;

  accounts.forEach((acc, index) => {
    const tx = dailyTxMap[acc.id] || { deposit: 0, withdrawal: 0 };
    totalDeposit += tx.deposit;
    totalWithdrawal += tx.withdrawal;
    totalBalance += acc.current_balance;

    rows.push([
      index + 1,
      acc.account_no,
      acc.name,
      acc.address,
      acc.contact_number,
      tx.deposit > 0 ? tx.deposit : '',
      tx.withdrawal > 0 ? tx.withdrawal : '',
      acc.current_balance,
      '',
    ]);
  });

  // Summary row
  rows.push([]);
  rows.push([
    'जम्मा (TOTAL)',
    '',
    '',
    '',
    '',
    totalDeposit,
    totalWithdrawal,
    totalBalance,
    '',
  ]);

  rows.push([]);
  rows.push(['संकलनकर्ताको हस्ताक्षर: ____________________', '', '', 'व्यवस्थापक/लेखापाल: ____________________']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 10 }, // S.N.
    { wch: 15 }, // A/C
    { wch: 28 }, // Name
    { wch: 22 }, // Address
    { wch: 16 }, // Contact
    { wch: 18 }, // Deposit
    { wch: 18 }, // Withdrawal
    { wch: 18 }, // Balance
    { wch: 20 }, // Signature
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daily_Collection');

  const fileName = `Manas_Collection_${agent.full_name.replace(/\s+/g, '_')}_${nepaliDateBS}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportMonthlyCollectionMatrixToExcel(
  accounts: Account[],
  transactions: Transaction[],
  monthYear: string,
  agentName: string
) {
  const rows: any[] = [];
  rows.push(['मानस कृषि सहकारी संस्था लि. - टिकापुर, कैलाली']);
  rows.push([`मासिक बचत संकलन तालिका (Monthly Collection Sheet) - ${monthYear}`]);
  rows.push([`बजार प्रतिनिधि: ${agentName}`]);
  rows.push([]);

  // Days 1 to 32 header
  const header = ['क्र.सं.', 'खाता नं.', 'सदस्यको नाम', 'सुरु मौज्दात'];
  for (let d = 1; d <= 32; d++) {
    header.push(`गते ${d}`);
  }
  header.push('कुल जम्मा');
  header.push('हालको मौज्दात');
  rows.push(header);

  accounts.forEach((acc, idx) => {
    const accTxs = transactions.filter(
      (tx) => tx.account_id === acc.id && tx.month_year === monthYear && tx.type === 'deposit'
    );
    const dayMap: Record<number, number> = {};
    let monthTotal = 0;
    accTxs.forEach((tx) => {
      dayMap[tx.day_number] = (dayMap[tx.day_number] || 0) + Number(tx.amount);
      monthTotal += Number(tx.amount);
    });

    const row = [idx + 1, acc.account_no, acc.name, acc.opening_balance];
    for (let d = 1; d <= 32; d++) {
      row.push(dayMap[d] || '');
    }
    row.push(monthTotal);
    row.push(acc.current_balance);
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly_Matrix');
  XLSX.writeFile(wb, `Manas_Monthly_Matrix_${monthYear.replace(/\s+/g, '_')}.xlsx`);
}

export function downloadSampleAccountsTemplate() {
  const sampleData = [
    ['account_no', 'name', 'address', 'contact_number', 'opening_balance'],
    ['MKS-3001', 'Hari Prasad Bhatta (हरि प्रसाद भट्ट)', 'Tikapur-1, Block D', '9848123400', 1000],
    ['MKS-3002', 'Bimala Devi Chaudhary (बिमला देवी चौधरी)', 'Tikapur-1, Milan Chowk', '9868123401', 500],
    ['MKS-3003', 'Ganesh Bahadur Budha (गणेश बहादुर बुढा)', 'Tikapur-1, Buspark Road', '9812987654', 1500],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Accounts_Template');
  XLSX.writeFile(wb, 'Manas_Sahakari_Accounts_Template.xlsx');
}

export async function parseAccountsFromExcelFile(file: File): Promise<Partial<Account>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsedAccounts: Partial<Account>[] = json.map((row) => ({
          account_no: String(row.account_no || row['खाता नं'] || `MKS-${Math.floor(1000 + Math.random() * 9000)}`).trim(),
          name: String(row.name || row['सदस्यको नाम'] || row.full_name || 'सदस्य').trim(),
          address: String(row.address || row['ठेगाना'] || 'Tikapur-1, Kailali').trim(),
          contact_number: String(row.contact_number || row['सम्पर्क नं'] || row.phone || '').trim(),
          opening_balance: Number(row.opening_balance || row['सुरु मौज्दात'] || 0),
          current_balance: Number(row.opening_balance || row['सुरु मौज्दात'] || 0),
          status: 'active',
        }));

        resolve(parsedAccounts);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
