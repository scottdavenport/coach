import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileUrl, fileName, mimeType } = await request.json()

    if (!fileUrl || !fileName || !mimeType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    try {
      let extractedContent = '';
      
      // Fetch file content from URL
      const fileResponse = await fetch(fileUrl)
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file')
      }

      const arrayBuffer = await fileResponse.arrayBuffer()

      switch (mimeType) {
        case 'application/pdf':
          extractedContent = await extractPdfContent(arrayBuffer)
          break
          
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          extractedContent = await extractDocxContent(arrayBuffer)
          break
          
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          extractedContent = await extractXlsxContent(arrayBuffer)
          break
          
        case 'text/csv':
          const text = new TextDecoder().decode(arrayBuffer)
          extractedContent = await extractCsvContent(text)
          break
          
        case 'text/plain':
        case 'text/markdown':
          extractedContent = new TextDecoder().decode(arrayBuffer)
          break
          
        default:
          throw new Error(`Unsupported file type: ${mimeType}`)
      }

      return NextResponse.json({
        success: true,
        fileName,
        content: extractedContent,
        metadata: {
          wordCount: extractedContent.split(/\s+/).length,
          characterCount: extractedContent.length
        }
      })

    } catch (error) {
      console.error('Content extraction error:', error)
      return NextResponse.json({
        success: false,
        fileName,
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      })
    }

  } catch (error) {
    console.error('File extraction API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function extractPdfContent(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfParse = await import('pdf-parse')
  const buffer = Buffer.from(arrayBuffer)
  const data = await pdfParse.default(buffer)
  const truncatedText = data.text.length > 2000 ? data.text.substring(0, 2000) + '...' : data.text
  return `PDF (${data.numpages} pages)\n\n${truncatedText}`
}

async function extractDocxContent(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer })
  const truncatedText = result.value.length > 2000 ? result.value.substring(0, 2000) + '...' : result.value
  return `Word Document\n\n${truncatedText}`
}

async function extractXlsxContent(arrayBuffer: ArrayBuffer): Promise<string> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)
  
  let content = `Excel (${workbook.worksheets.length} sheets)\n`

  // Only process first sheet to save tokens
  const firstSheet = workbook.worksheets[0]
  if (firstSheet) {
    const jsonData: any[] = []
    
    // Convert worksheet to JSON format similar to XLSX
    firstSheet.eachRow((row) => {
      const rowData: any[] = []
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[colNumber - 1] = cell.value
      })
      jsonData.push(rowData)
    })
    
    content += `${firstSheet.name}: ${jsonData.length} rows\n`
    
    // Show only first 2 rows
    const preview = jsonData.slice(0, 2)
    preview.forEach((row, rowIndex) => {
      const filteredRow = row.filter(cell => cell !== null && cell !== undefined)
      const rowStr = filteredRow.slice(0, 3).join(' | ') + (filteredRow.length > 3 ? '...' : '')
      content += `${rowIndex + 1}: ${rowStr}\n`
    })
    
    if (jsonData.length > 2) {
      content += `... +${jsonData.length - 2} more rows`
    }
  }

  return content
}

async function extractCsvContent(text: string): Promise<string> {
  const Papa = await import('papaparse')
  
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  })

  // Convert to readable format (TRUNCATED for tokens)
  const data = result.data as Record<string, string>[]
  const headers = Object.keys(data[0] || {})
  const preview = data.slice(0, 2) // Show only first 2 rows

  let content = `CSV (${data.length} rows, ${headers.length} cols)\n`
  content += `Headers: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}\n`
  content += `Sample:\n`
  
  preview.forEach((row, index) => {
    const rowStr = JSON.stringify(row)
    content += `${index + 1}: ${rowStr.length > 100 ? rowStr.substring(0, 100) + '...' : rowStr}\n`
  })

  if (data.length > 2) {
    content += `... +${data.length - 2} rows`
  }

  return content
}