"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { DataPreview } from "./data-preview"

interface UploadedFile {
  file: File
  id: string
  status: "pending" | "processing" | "success" | "error"
  error?: string
  preview?: any[]
}

export function FileUploadSection() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [consolidatedFile, setConsolidatedFile] = useState<string | null>(null)
  const [isValidForConsolidation, setIsValidForConsolidation] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      console.log("Rejected files:", rejectedFiles)
    }

    // Add accepted files
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: "pending",
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
    setIsValidForConsolidation(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  })

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id))
    setIsValidForConsolidation(false)
  }

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return

    setIsProcessing(true)

    try {
      const formData = new FormData()
      uploadedFiles.forEach((uploadedFile, index) => {
        formData.append(`files`, uploadedFile.file)
      })

      const response = await fetch("/api/consolidate", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error occurred" }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("spreadsheetml") && !contentType?.includes("excel")) {
        console.warn("Unexpected content type:", contentType)
      }

      const blob = await response.blob()
      if (blob.size === 0) {
        throw new Error("Received empty file from server")
      }

      const url = URL.createObjectURL(blob)
      setConsolidatedFile(url)

      setUploadedFiles((prev) => prev.map((file) => ({ ...file, status: "success" as const })))
    } catch (error) {
      console.error("Error processing files:", error)
      setUploadedFiles((prev) =>
        prev.map((file) => ({
          ...file,
          status: "error" as const,
          error: error instanceof Error ? error.message : "Failed to process file",
        })),
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadConsolidatedFile = () => {
    if (consolidatedFile) {
      try {
        const link = document.createElement("a")
        link.href = consolidatedFile
        link.download = `consolidated-excel-${new Date().toISOString().split("T")[0]}.xlsx`
        link.style.display = "none"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        console.log("[v0] Download initiated successfully")
      } catch (error) {
        console.error("[v0] Download failed:", error)
        window.open(consolidatedFile, "_blank")
      }
    }
  }

  const resetUpload = () => {
    setUploadedFiles([])
    setConsolidatedFile(null)
    setIsValidForConsolidation(false)
    if (consolidatedFile) {
      URL.revokeObjectURL(consolidatedFile)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleValidationComplete = (isValid: boolean) => {
    setIsValidForConsolidation(isValid)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Téléverser les fichiers Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/50 hover:bg-secondary/5"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 bg-secondary/10 rounded-full">
                <FileSpreadsheet className="w-8 h-8 text-secondary" />
              </div>
              {isDragActive ? (
                <div>
                  <p className="text-lg font-medium text-secondary">Drop your Excel files here</p>
                  <p className="text-sm text-muted-foreground">Release to upload</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Drag & drop Excel files here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">Supports .xlsx and .xls files up to 50MB each</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Uploaded Files ({uploadedFiles.length})
              </CardTitle>
              <Button variant="outline" className="bg-red-50 rounded-md" size="sm" onClick={resetUpload}>
                Supprimer tous
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((uploadedFile) => (
                <div
                  key={uploadedFile.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileSpreadsheet className="w-5 h-5 text-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{uploadedFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.file.size)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploadedFile.status === "pending" && <Badge variant="secondary">Pending</Badge>}
                      {uploadedFile.status === "processing" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing
                        </Badge>
                      )}
                      {uploadedFile.status === "success" && (
                        <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </Badge>
                      )}
                      {uploadedFile.status === "error" && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Error
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.id)}
                    className="ml-2 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {uploadedFiles.length > 0 && !consolidatedFile && (
        <DataPreview files={uploadedFiles.map((f) => f.file)} onValidationComplete={handleValidationComplete} />
      )}

      {/* Process Files Section */}
      {uploadedFiles.length > 0 && !consolidatedFile && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Ready to Consolidate</h3>
                <p className="text-sm text-muted-foreground">
                  {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} ready for processing
                </p>
                {!isValidForConsolidation && (
                  <p className="text-sm text-amber-600 mt-2">
                    Please preview and validate your data before consolidating
                  </p>
                )}
              </div>
              <Button
                onClick={processFiles}
                disabled={isProcessing || !isValidForConsolidation}
                size="lg"
                className="w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Files...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Consolidate Files
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Section */}
      {consolidatedFile && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Consolidation Complete!</h3>
                <p className="text-sm text-green-600">Your Excel files have been successfully merged</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={downloadConsolidatedFile} size="lg" className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  Download Consolidated File
                </Button>
                <Button variant="outline" onClick={resetUpload} size="lg">
                  Start New Consolidation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Processing Files</h3>
                <p className="text-sm text-muted-foreground">Please wait while we consolidate your Excel files...</p>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips:</strong> Ensure all Excel files have similar column structures for best results. The
          consolidation process will automatically match columns by name and merge all data into a single file.
        </AlertDescription>
      </Alert>
    </div>
  )
}
