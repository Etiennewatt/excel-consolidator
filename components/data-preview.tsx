"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, BarChart3, CheckCircle2, Columns, Eye, FileSpreadsheet, FileText } from "lucide-react"
import { useState } from "react"

interface PreviewData {
  filename: string
  columns: string[]
  sampleRows: any[]
  totalRows: number
  isValid: boolean
  errors: string[]
}

interface PreviewSummary {
  totalFiles: number
  validFiles: number
  totalRows: number
  allColumns: string[]
}

interface DataPreviewProps {
  files: File[]
  onValidationComplete: (isValid: boolean) => void
}

export function DataPreview({ files, onValidationComplete }: DataPreviewProps) {
  const [previews, setPreviews] = useState<PreviewData[]>([])
  const [summary, setSummary] = useState<PreviewSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasPreviewedOnce, setHasPreviewedOnce] = useState(false)

  const generatePreview = async () => {
    if (files.length === 0) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/preview", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to generate preview")
      }

      const data = await response.json()
      setPreviews(data.previews)
      setSummary(data.summary)
      setHasPreviewedOnce(true)

      // Notify parent component about validation status
      const allValid = data.previews.every((p: PreviewData) => p.isValid)
      onValidationComplete(allValid)
    } catch (error) {
      console.error("Error generating preview:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (files.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Data Preview & Validation
          </CardTitle>
          <Button onClick={generatePreview} disabled={isLoading} variant={hasPreviewedOnce ? "outline" : "default"}>
            {isLoading ? "Analyzing..." : hasPreviewedOnce ? "Refresh Preview" : "Preview Data"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasPreviewedOnce && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center w-16 h-16 bg-secondary/10 rounded-full mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Preview Your Data</h3>
            <p className="text-muted-foreground mb-4">
              Click "Preview Data" to validate your Excel files and see a sample of the data before consolidation.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-secondary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing your Excel files...</p>
          </div>
        )}

        {summary && previews.length > 0 && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary/5 rounded-lg">
                <FileText className="w-6 h-6 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold text-secondary">{summary.totalFiles}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{summary.validFiles}</div>
                <div className="text-sm text-muted-foreground">Valid Files</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{summary.totalRows.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Columns className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">{summary.allColumns.length}</div>
                <div className="text-sm text-muted-foreground">Unique Columns</div>
              </div>
            </div>

            {/* Validation Status */}
            {summary.validFiles !== summary.totalFiles && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {summary.totalFiles - summary.validFiles} file(s) have validation errors. Please review and fix the
                  issues before consolidating.
                </AlertDescription>
              </Alert>
            )}

            {summary.validFiles === summary.totalFiles && summary.totalFiles > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  All files passed validation! Ready for consolidation.
                </AlertDescription>
              </Alert>
            )}

            {/* File Previews */}
            <Tabs defaultValue="0" className="w-full">
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
                {previews.map((preview, index) => (
                  <TabsTrigger key={index} value={index.toString()} className="flex items-center gap-2 text-xs">
                    {preview.isValid ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                    )}
                    <span className="truncate max-w-20">{preview.filename}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {previews.map((preview, index) => (
                <TabsContent key={index} value={index.toString()} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{preview.filename}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{preview.totalRows.toLocaleString()} rows</span>
                        <span>{preview.columns.length} columns</span>
                      </div>
                    </div>
                    <Badge variant={preview.isValid ? "default" : "destructive"}>
                      {preview.isValid ? "Valid" : "Invalid"}
                    </Badge>
                  </div>

                  {/* Errors */}
                  {preview.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {preview.errors.map((error, errorIndex) => (
                            <li key={errorIndex}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Column List */}
                  {preview.columns.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Columns ({preview.columns.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {preview.columns.map((column, colIndex) => (
                          <Badge key={colIndex} variant="outline" className="text-xs">
                            {column}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Data */}
                  {preview.sampleRows.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sample Data (First 5 rows)</h4>
                      <ScrollArea className="h-64 w-full border rounded-md overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {preview.columns.map((column, colIndex) => (
                                <TableHead key={colIndex} className="whitespace-nowrap">
                                  {column}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody className="overflow-auto">
                            {preview.sampleRows.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {preview.columns.map((column, colIndex) => (
                                  <TableCell key={colIndex} className="whitespace-nowrap">
                                    {String(row[column] || "")}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
