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

// ✅ Fonction utilitaire pour normaliser les chaînes
function normalizeString(value: string): string {
  return value
    .normalize("NFD") // Sépare les caractères de base et les accents
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .toLowerCase() // Passe en minuscule
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const previews: PreviewData[] = []
    let referenceHeaders: string[] | null = null
    let referenceFirstRow: string[] | null = null

    for (const file of files) {
      try {
        // ✅ Vérif type
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

        // ✅ Vérif taille
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
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
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
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
          header: 1,
          defval: null,
          raw: true,
        })

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

        // ✅ Lecture des headers + suppression colonnes vides en fin
        let headers = jsonData[0].map((h: any) => (h ? String(h).trim() : "")) as string[]
        while (headers.length > 0 && headers[headers.length - 1] === "") {
          headers.pop()
        }

        const normalizedHeaders = headers.map(normalizeString)
        const errors: string[] = []

        if (!headers.length) {
          errors.push("No column headers found.")
        }

        const firstDataRow = jsonData.length > 1 ? jsonData[1] : []
        const normalizedFirstRow = firstDataRow
          .slice(0, headers.length) // ✅ Tronquer aussi les colonnes vides
          .map((v: any) => (v !== null && v !== undefined ? normalizeString(String(v)) : ""))

        let isValid = true
        if (!referenceHeaders) {
          referenceHeaders = normalizedHeaders
          referenceFirstRow = normalizedFirstRow
        } else {
          // ✅ Comparaison des headers normalisés (longueurs égales grâce au pop)
          if (JSON.stringify(normalizedHeaders) !== JSON.stringify(referenceHeaders)) {
            console.log({
              header01: JSON.stringify(normalizedHeaders),
              header02: JSON.stringify(referenceHeaders),
            })

            const currentFirstRowString = JSON.stringify(normalizedFirstRow)
            const referenceFirstRowString = JSON.stringify(referenceFirstRow)

            if (currentFirstRowString === referenceFirstRowString) {
              errors.push(
                "Column headers differ (case/accents/empty columns), but first data row is identical. File accepted."
              )
            } else {
              errors.push("Column structure differs from the first file.")
              errors.push("First data row also differs from the first file.")
              isValid = false
            }
          }
        }

        // ✅ Construction des sampleRows alignés sur les colonnes utiles
        const sampleRows = jsonData.slice(1, 6).map((row) => {
          const rowObject: Record<string, any> = {}
          headers.forEach((header, i) => {
            const value = row[i]
            rowObject[header] =
              value instanceof Date
                ? value.toISOString().split("T")[0]
                : value ?? ""
          })
          return rowObject
        })

        const totalRows = jsonData
          .slice(1)
          .filter((row) =>
            row.slice(0, headers.length).some(
              (cell) => cell !== null && cell !== undefined && cell !== ""
            )
          ).length

        previews.push({
          filename: file.name,
          columns: headers,
          sampleRows,
          totalRows,
          isValid:
            (isValid && errors.length === 0) ||
            errors.every((e) => e.includes("accepted")),
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

    return NextResponse.json({
      previews,
      summary: {
        totalFiles: files.length,
        validFiles: previews.filter((p) => p.isValid).length,
        totalRows: previews.reduce((sum, p) => sum + p.totalRows, 0),
        allColumns: Array.from(new Set(previews.flatMap((p) => p.columns))),
      },
    })
  } catch (error) {
    console.error("Error in preview API:", error)
    return NextResponse.json(
      { error: "Internal server error during file preview" },
      { status: 500 }
    )
  }
}
