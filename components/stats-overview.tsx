import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, Merge, Shield } from "lucide-react"

export function StatsOverview() {
  const stats = [
    {
      title: "Files Supported",
      value: ".xlsx, .xls",
      description: "Excel formats",
      icon: FileText,
    },
    {
      title: "Max File Size",
      value: "50 MB",
      description: "Per upload session",
      icon: Shield,
    },
    {
      title: "Auto Merge",
      value: "Smart",
      description: "Column matching",
      icon: Merge,
    },
    {
      title: "Download",
      value: "Instant",
      description: "Consolidated file",
      icon: Download,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-auto">
      {stats.map((stat, index) => (
        <Card key={index} className="text-center">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-lg mx-auto mb-2">
              <stat.icon className="w-6 h-6 text-secondary" />
            </div>
            <CardTitle className="text-lg">{stat.title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-auto">
            <div className="text-2xl font-bold text-secondary mb-1">{stat.value}</div>
            <p className="text-sm text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
