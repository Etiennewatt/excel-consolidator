import { FileSpreadsheet } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-secondary rounded-lg">
            <FileSpreadsheet className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-card-foreground">Excel Consolidator</h1>
            <p className="text-sm text-muted-foreground">Professional data merging tool</p>
          </div>
        </div>
      </div>
    </header>
  )
}
