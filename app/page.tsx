import { FileUploader } from "@/components/file-uploader"
import { SwaggerViewer } from "@/components/swagger-viewer"

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Swagger API Documentation Extractor</h1>
      <p className="text-gray-600 mb-8">
        Import a Swagger JSON/YAML document to view and extract documentation for specific API tags.
      </p>
      <FileUploader />
      <SwaggerViewer />
    </main>
  )
}
