import { FileUploader } from "@/components/file-uploader"
import { SwaggerViewer } from "@/components/swagger-viewer"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600 mb-4">
            Swagger API Documentation Extractor
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Import a Swagger JSON/YAML document to view and extract documentation for specific API tags.
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto shadow-lg rounded-xl overflow-hidden bg-white">
          <div className="p-1">
            <div className="bg-white p-6">
              <FileUploader />
            </div>
          </div>
        </div>
        
        <div className="mt-8 max-w-5xl mx-auto">
          <SwaggerViewer />
        </div>
      </main>
    </div>
  )
}
