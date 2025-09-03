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
  return `PDF Document (${data.numpages} pages)\n\nContent:\n${data.text}`
}

async function extractDocxContent(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer })
  return `Word Document\n\nContent:\n${result.value}`
}

async function extractXlsxContent(arrayBuffer: ArrayBuffer): Promise<string> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  
  let content = `Excel Spreadsheet (${workbook.SheetNames.length} sheets)\n\n`

  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    content += `Sheet ${index + 1}: ${sheetName}\n`
    content += `Rows: ${jsonData.length}\n`
    
    // Show first few rows
    const preview = jsonData.slice(0, 5) as string[][]
    preview.forEach((row, rowIndex) => {
      content += `Row ${rowIndex + 1}: ${row.join(' | ')}\n`
    })
    
    if (jsonData.length > 5) {
      content += `... and ${jsonData.length - 5} more rows\n`
    }
    content += '\n'
  })

  return content
}

async function extractCsvContent(text: string): Promise<string> {
  const Papa = await import('papaparse')
  
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  })

  if (result.errors.length > 0) {
    console.warn('CSV parsing warnings:', result.errors)
  }

  // Convert to readable format
  const data = result.data as Record<string, string>[]
  const headers = Object.keys(data[0] || {})
  const preview = data.slice(0, 10) // Show first 10 rows

  let content = `CSV Data (${data.length} rows, ${headers.length} columns)\n\n`
  content += `Headers: ${headers.join(', ')}\n\n`
  content += `First ${preview.length} rows:\n`
  
  preview.forEach((row, index) => {
    content += `Row ${index + 1}: ${JSON.stringify(row)}\n`
  })

  if (data.length > 10) {
    content += `\n... and ${data.length - 10} more rows`
  }

  return content
}