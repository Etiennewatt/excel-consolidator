import { type NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

interface ExcelRow {
  [key: string]: any;
}

interface ProcessedFile {
  filename: string;
  data: ExcelRow[];
  columns: string[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate file types and sizes
    for (const file of files) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        return NextResponse.json(
          {
            error: `Invalid file type: ${file.name}. Only .xlsx and .xls files are supported.`,
          },
          { status: 400 }
        );
      }

      if (file.size > 50 * 1024 * 1024) {
        // 50MB limit
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 50MB.` },
          { status: 400 }
        );
      }
    }

    const processedFiles: ProcessedFile[] = [];
    const allColumns = new Set<string>();

    // Process each Excel file
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "buffer" });

        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          return NextResponse.json(
            { error: `No worksheets found in file: ${file.name}` },
            { status: 400 }
          );
        }

        const worksheet = workbook.Sheets[firstSheetName];
        // const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][]
        // Convertir chaque ligne manuellement pour garder exactement ce qui est affiché

        // const range = XLSX.utils.decode_range(worksheet["!ref"]!);
        // const jsonData: string[][] = [];

        // for (let R = range.s.r; R <= range.e.r; ++R) {
        //   const row: string[] = [];
        //   for (let C = range.s.c; C <= range.e.c; ++C) {
        //     const cellAddress = { c: C, r: R };
        //     const cellRef = XLSX.utils.encode_cell(cellAddress);
        //     const cell = worksheet[cellRef];
        //     if (cell) {
        //       // Utiliser w = "formatted text", v = valeur brute
        //       row.push(cell.w ?? String(cell.v ?? ""));
        //     } else {
        //       row.push("");
        //     }
        //   }
        //   jsonData.push(row);
        // }

        const range = XLSX.utils.decode_range(worksheet["!ref"]!);
        const jsonData: string[][] = [];

        for (let R = range.s.r; R <= range.e.r; ++R) {
          const row: string[] = [];
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = { c: C, r: R };
            const cellRef = XLSX.utils.encode_cell(cellAddress);
            const cell = worksheet[cellRef];
            const isArrayCell = cell?.w?.includes("/");
            if (cell) {
              if(isArrayCell){
                row.push(cell.w ?? String(cell.v ?? ""));
              }
              else if (cell.t === "n") {
                // nombre → convertir en string avec toutes les décimales
                row.push(cell.v.toString());
              } else if (cell.t === "d") {
                // date → convertir en texte ISO ou garder comme Excel
                row.push(cell.v.toString());
              } else {
                // texte ou autre type
                // row.push(cell.v ?? "");
                row.push(cell.w ?? String(cell.v ?? ""));
              }
            } else {
              row.push("");
            }
          }
          jsonData.push(row);
        }

        if (jsonData.length === 0) {
          return NextResponse.json(
            { error: `Empty file: ${file.name}` },
            { status: 400 }
          );
        }

        // Extract headers (first row)
        const headers = jsonData[0] as string[];
        if (!headers || headers.length === 0) {
          return NextResponse.json(
            { error: `No headers found in file: ${file.name}` },
            { status: 400 }
          );
        }

        // Convert to objects with headers as keys
        const data: ExcelRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (
            row &&
            row.some(
              (cell) => cell !== null && cell !== undefined && cell !== ""
            )
          ) {
            const rowObject: ExcelRow = {};
            headers.forEach((header, index) => {
              if (header) {
                rowObject[header] = row[index] || "";
                rowObject["_source_file"] = file.name; // Add source file tracking
              }
            });
            data.push(rowObject);
          }
        }

        // Track all unique columns
        headers.forEach((header) => {
          if (header) allColumns.add(header);
        });

        processedFiles.push({
          filename: file.name,
          data,
          columns: headers.filter(Boolean),
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        return NextResponse.json(
          {
            error: `Failed to process file: ${file.name}. Please ensure it's a valid Excel file.`,
          },
          { status: 400 }
        );
      }
    }

    // Consolidate all data
    const consolidatedData: ExcelRow[] = [];
    const finalColumns = [...processedFiles[0].columns];

    // Add source file column
    // finalColumns.push("Source File")

    for (const processedFile of processedFiles) {
      for (const row of processedFile.data) {
        const consolidatedRow: ExcelRow = {};

        // Ensure all columns are present in each row
        finalColumns.forEach((column) => {
          // if (column === "Source File") {
          //   consolidatedRow[column] = row["_source_file"] || processedFile.filename
          // } else {
          consolidatedRow[column] = row[column] || "";
          // }
        });

        consolidatedData.push(consolidatedRow);
      }
    }

    // Sort by first column if it exists (could be Request Number, ID, etc.)
    if (finalColumns.length > 0 && consolidatedData.length > 0) {
      const sortColumn = finalColumns[0];
      consolidatedData.sort((a, b) => {
        const aVal = String(a[sortColumn] || "");
        const bVal = String(b[sortColumn] || "");
        return aVal.localeCompare(bVal, undefined, { numeric: true });
      });
    }

    // Create new workbook
    const newWorkbook = XLSX.utils.book_new();

    // Convert consolidated data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(consolidatedData, {
      header: finalColumns,
    });

    // Auto-size columns
    const colWidths = finalColumns.map((col) => {
      const maxLength = Math.max(
        col.length,
        ...consolidatedData.map((row) => String(row[col] || "").length)
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Cap at 50 characters
    });
    worksheet["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(newWorkbook, worksheet, "Consolidated Data");

    // Generate Excel buffer
    const excelBuffer = XLSX.write(newWorkbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="consolidated-excel-${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error in consolidate API:", error);
    return NextResponse.json(
      { error: "Internal server error during file processing" },
      { status: 500 }
    );
  }
}
