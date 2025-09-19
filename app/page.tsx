import FileUploadSection from "@/components/file-upload-section"
import { Header } from "@/components/header"
import { StatsOverview } from "@/components/stats-overview"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground text-balance">Consilateur excel</h1>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              Merge multiple Excel files into one unified document with automatic data validation and formatting
            </p>
          </div>

          {/* Stats Overview */}
          <StatsOverview />

          {/* File Upload Section */}
          <FileUploadSection />
        </div>
      </main>
    </div>
  )
}
