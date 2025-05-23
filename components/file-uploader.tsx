"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { parseSwaggerDocument } from "@/lib/swagger-utils"

export function FileUploader() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const processFile = async (file: File) => {
    setIsLoading(true)
    try {
      const fileContent = await readFileContent(file)
      const swaggerDoc = await parseSwaggerDocument(
        fileContent,
        file.name.toLowerCase().endsWith(".yml") || file.name.toLowerCase().endsWith(".yaml"),
      )

      // Store the swagger document in localStorage
      localStorage.setItem("swaggerDocument", JSON.stringify(swaggerDoc))

      toast({
        title: "Document imported successfully",
        description: `Imported ${file.name}`,
      })

      // Force a refresh to update the SwaggerViewer
      router.refresh()
    } catch (error) {
      console.error("Error parsing Swagger document:", error)
      toast({
        title: "Error importing document",
        description: "Please ensure the file is a valid Swagger JSON or YAML document.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => resolve(event.target?.result as string)
      reader.onerror = (error) => reject(error)
      reader.readAsText(file)
    })
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (
        file.type === "application/json" ||
        file.name.endsWith(".json") ||
        file.name.endsWith(".yaml") ||
        file.name.endsWith(".yml")
      ) {
        await processFile(file)
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a JSON or YAML file.",
          variant: "destructive",
        })
      }
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-4">Drag and drop your Swagger JSON or YAML file, or click to browse</p>
          <Button variant="outline" className="relative" disabled={isLoading} onClick={handleButtonClick}>
            {isLoading ? "Importing..." : "Import Swagger Document"}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".json,.yaml,.yml"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
