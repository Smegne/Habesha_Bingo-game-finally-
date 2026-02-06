// app/admin/page.tsx (or wherever you want it)
import { DatabaseManager } from "@/components/admin/database-manager"

export default function AdminPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <DatabaseManager />
    </div>
  )
}