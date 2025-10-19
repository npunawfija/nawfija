import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FinanceRecord {
  id: number;
  amount: number;
  transaction_type: string;
  description: string;
  transaction_date: string;
  payment_status: string;
  due_date?: string;
  receipt_number?: string;
  user_id: string;
  users?: {
    name: string;
    email: string;
  };
}

interface FinanceOverview {
  total_contributions: number;
  total_dues_collected: number;
  total_outstanding_dues: number;
  total_donations: number;
  total_fines: number;
  total_expenses: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { format, records, overview, filters } = await req.json()

    if (format === 'csv') {
      return exportCSV(records, overview, filters)
    } else if (format === 'pdf') {
      return exportPDF(records, overview, filters)
    } else {
      throw new Error('Invalid export format')
    }
  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function exportCSV(records: FinanceRecord[], overview: FinanceOverview, filters: any) {
  console.log('Generating CSV export...')
  
  // Create CSV headers
  const headers = [
    'Date',
    'User Name',
    'User Email', 
    'Transaction Type',
    'Amount',
    'Payment Status',
    'Due Date',
    'Receipt Number',
    'Description'
  ].join(',')

  // Create CSV rows
  const rows = records.map(record => [
    record.transaction_date,
    record.users?.name || 'Unknown',
    record.users?.email || 'N/A',
    record.transaction_type,
    record.amount,
    record.payment_status,
    record.due_date || '',
    record.receipt_number || '',
    `"${(record.description || '').replace(/"/g, '""')}"`
  ].join(','))

  // Add summary section
  const summarySection = [
    '',
    '--- SUMMARY ---',
    `Total Contributions,${overview.total_contributions}`,
    `Total Dues Collected,${overview.total_dues_collected}`,
    `Outstanding Dues,${overview.total_outstanding_dues}`,
    `Total Donations,${overview.total_donations}`,
    `Total Fines,${overview.total_fines}`,
    `Total Expenses,${overview.total_expenses}`,
    `Net Balance,${Number(overview.total_contributions) + Number(overview.total_dues_collected) + Number(overview.total_donations) - Number(overview.total_expenses)}`
  ]

  const csvContent = [headers, ...rows, ...summarySection].join('\n')

  return new Response(csvContent, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="finance-report-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}

function exportPDF(records: FinanceRecord[], overview: FinanceOverview, filters: any) {
  console.log('Generating PDF export...')
  
  // Simple HTML to PDF conversion (basic implementation)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Finance Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
        .summary-card .amount { font-size: 24px; font-weight: bold; }
        .green { color: #16a34a; }
        .red { color: #dc2626; }
        .blue { color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .badge { padding: 2px 8px; border-radius: 4px; color: white; font-size: 10px; }
        .badge-contribution { background-color: #16a34a; }
        .badge-dues { background-color: #dc2626; }
        .badge-donation { background-color: #2563eb; }
        .badge-fine { background-color: #ea580c; }
        .badge-expense { background-color: #6b7280; }
        .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Finance Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        ${filters.user ? `<p>Filtered by User</p>` : ''}
        ${filters.searchTerm ? `<p>Search: "${filters.searchTerm}"</p>` : ''}
      </div>
      
      <div class="summary">
        <h2>Financial Summary</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Contributions</h3>
            <div class="amount green">₦${Number(overview.total_contributions).toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>Dues Collected</h3>
            <div class="amount green">₦${Number(overview.total_dues_collected).toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>Outstanding Dues</h3>
            <div class="amount red">₦${Number(overview.total_outstanding_dues).toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>Total Donations</h3>
            <div class="amount blue">₦${Number(overview.total_donations).toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>Total Fines</h3>
            <div class="amount red">₦${Number(overview.total_fines).toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>Total Expenses</h3>
            <div class="amount">₦${Number(overview.total_expenses).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div class="records">
        <h2>Transaction Records</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(record => `
              <tr>
                <td>${new Date(record.transaction_date).toLocaleDateString()}</td>
                <td>${record.users?.name || 'Unknown'}</td>
                <td>
                  <span class="badge badge-${record.transaction_type}">
                    ${record.transaction_type.charAt(0).toUpperCase() + record.transaction_type.slice(1)}
                  </span>
                </td>
                <td>₦${Number(record.amount).toLocaleString()}</td>
                <td>${record.payment_status}</td>
                <td>${record.description || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>This report contains ${records.length} transaction records.</p>
        <p>Report generated by Admin Finance Portal</p>
      </div>
    </body>
    </html>
  `

  // For a basic implementation, we'll return the HTML content
  // In a production environment, you'd use a proper HTML-to-PDF library
  return new Response(htmlContent, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="finance-report-${new Date().toISOString().split('T')[0]}.html"`
    }
  })
}