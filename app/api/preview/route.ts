import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

interface PreviewData {
  filename: string
  columns: string[]
  sampleRows: any[]
  totalRows: number
  isValid: boolean
  errors: string[]
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const previews: PreviewData[] = []
    const allColumns = new Set<string>()

    for (const file of files) {
      try {
        // Validate file type
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
          previews.push({
            filename: file.name,
            columns: [],
            sampleRows: [],
            totalRows: 0,
            isValid: false,
            errors: ["Invalid file type. Only .xlsx and .xls files are supported."],
          })
          continue
        }

        // Validate file size
        if (file.size > 50 * 1024 * 1024) {
          previews.push({
            filename: file.name,
            columns: [],
            sampleRows: [],
            totalRows: 0,
            isValid: false,
            errors: ["File too large. Maximum size is 50MB."],
          })
          continue
        }

        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: "buffer" })

        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          previews.push({
            filename: file.name,
            columns: [],
            sampleRows: [],
            totalRows: 0,
            isValid: false,
            errors: ["No worksheets found in file."],
          })
          continue
        }

        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (jsonData.length === 0) {
          previews.push({
            filename: file.name,
            columns: [],
            sampleRows: [],
            totalRows: 0,
            isValid: false,
            errors: ["File appears to be empty."],
          })
          continue
        }

        // Extract headers
        const headers = jsonData[0] as string[]
        if (!headers || headers.length === 0) {
          previews.push({
            filename: file.name,
            columns: [],
            sampleRows: [],
            totalRows: 0,
            isValid: false,
            errors: ["No column headers found."],
          })
          continue
        }

        // Clean headers and check for duplicates
        const cleanHeaders = headers.filter(Boolean)
        const headerSet = new Set(cleanHeaders)
        const errors: string[] = []

        if (headerSet.size !== cleanHeaders.length) {
          errors.push("Duplicate column headers detected.")
        }

        // Track all columns for consistency check
        cleanHeaders.forEach((header) => allColumns.add(header))

        // Convert to objects and get sample rows
        const sampleRows: any[] = []
        let totalDataRows = 0

        for (let i = 1; i < Math.min(jsonData.length, 6); i++) {
          // Get first 5 data rows for preview
          const row = jsonData[i]
          if (row && row.some((cell) => cell !== null && cell !== undefined && cell !== "")) {
            const rowObject: any = {}
            cleanHeaders.forEach((header, index) => {
              rowObject[header] = row[index] || ""
            })
            sampleRows.push(rowObject)
          }
        }

        // Count total data rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row && row.some((cell) => cell !== null && cell !== undefined && cell !== "")) {
            totalDataRows++
          }
        }

        previews.push({
          filename: file.name,
          columns: cleanHeaders,
          sampleRows,
          totalRows: totalDataRows,
          isValid: errors.length === 0,
          errors,
        })
      } catch (error) {
        console.error(`Error previewing file ${file.name}:`, error)
        previews.push({
          filename: file.name,
          columns: [],
          sampleRows: [],
          totalRows: 0,
          isValid: false,
          errors: ["Failed to read file. Please ensure it's a valid Excel file."],
        })
      }
    }

    // Check for column consistency across files
    const validFiles = previews.filter((p) => p.isValid)
    if (validFiles.length > 1) {
      const firstFileColumns = new Set(validFiles[0].columns)
      const inconsistentFiles: string[] = []

      for (let i = 1; i < validFiles.length; i++) {
        const currentFileColumns = new Set(validFiles[i].columns)
        const hasAllColumns = validFiles[0].columns.every((col) => currentFileColumns.has(col))
        const sameColumnCount = firstFileColumns.size === currentFileColumns.size

        if (!hasAllColumns || !sameColumnCount) {
          inconsistentFiles.push(validFiles[i].filename)
        }
      }

      if (inconsistentFiles.length > 0) {
        inconsistentFiles.forEach((filename) => {
          const preview = previews.find((p) => p.filename === filename)
          if (preview) {
            preview.errors.push("Column structure differs from other files.")
          }
        })
      }
    }

    return NextResponse.json({
      previews,
      summary: {
        totalFiles: files.length,
        validFiles: previews.filter((p) => p.isValid).length,
        totalRows: previews.reduce((sum, p) => sum + p.totalRows, 0),
        allColumns: Array.from(allColumns).sort(),
      },
    })
  } catch (error) {
    console.error("Error in preview API:", error)
    return NextResponse.json({ error: "Internal server error during file preview" }, { status: 500 })
  }
}
