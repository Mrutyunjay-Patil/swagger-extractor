"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { parseSwaggerDocument } from "@/lib/swagger-utils"

import { useSwaggerDocument } from "@/components/swagger-document-context"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function FileUploader() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const { toast } = useToast()
  const { setSwaggerDoc } = useSwaggerDocument();
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState("file")
  const [pasted, setPasted] = useState("")
  const [url, setUrl] = useState("")
  const [isFetching, setIsFetching] = useState(false)

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

      setSwaggerDoc(swaggerDoc);

      toast({
        title: "Document imported successfully",
        description: `Imported ${file.name}`,
      })
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
    <Card className="mb-8 border-none shadow-none">
      <CardContent className="p-0">
        <Tabs defaultValue="file" value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6 bg-gradient-to-r from-blue-100 to-green-100 p-1 rounded-lg">
            <TabsTrigger value="file" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 transition-all duration-200">File Upload</TabsTrigger>
            <TabsTrigger value="paste" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 transition-all duration-200">Copy-Paste</TabsTrigger>
            <TabsTrigger value="url" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 transition-all duration-200">Import by URL</TabsTrigger>
          </TabsList>

          {/* File Upload */}
          <TabsContent value="file">
            <div
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-300 ${
                isDragging ? "border-blue-500 bg-blue-50 scale-[0.99]" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className={`p-4 rounded-full bg-blue-100 mb-6 transition-all duration-300 ${isDragging ? "bg-blue-200 scale-110" : ""}`}>
                <Upload className={`h-10 w-10 transition-colors duration-300 ${isDragging ? "text-blue-600" : "text-blue-500"}`} />
              </div>
              <p className="text-base text-gray-600 mb-5 text-center max-w-md">
                Drag and drop your Swagger JSON or YAML file, or click to browse
              </p>
              <Button 
                variant="default" 
                className="relative bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg" 
                disabled={isLoading} 
                onClick={handleButtonClick}
              >
                <span className="flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>Import Swagger Document</>
                  )}
                </span>
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
          </TabsContent>

          {/* Copy-Paste */}
          <TabsContent value="paste">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsLoading(true);
                try {
                  const swaggerDoc = await parseSwaggerDocument(pasted, pasted.trim().startsWith("openapi") || pasted.trim().startsWith("swagger") ? false : pasted.trim().startsWith("---"));
                  setSwaggerDoc(swaggerDoc);
                  toast({ title: "Document imported successfully", description: "Imported from pasted text" });
                } catch (error) {
                  console.error("Error parsing Swagger document:", error);
                  toast({ title: "Error importing document", description: "Please ensure the text is a valid Swagger JSON or YAML document.", variant: "destructive" });
                } finally {
                  setIsLoading(false);
                }
              }}
              className="flex flex-col gap-5 p-6 border-2 border-gray-200 rounded-xl bg-white"
            >
              <div className="flex items-center gap-3 text-blue-600 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 12h6"></path><path d="M9 16h6"></path></svg>
                <h3 className="font-medium">Paste Swagger/OpenAPI Content</h3>
              </div>
              <Textarea
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                rows={10}
                placeholder="Paste Swagger/OpenAPI JSON or YAML here"
                disabled={isLoading}
                className="border-gray-200 focus:border-blue-300 focus:ring-blue-200 transition-all duration-200 text-sm font-mono"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !pasted.trim()}
                className="bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg self-start"
              >
                <span className="flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>Import from Text</>
                  )}
                </span>
              </Button>
            </form>
          </TabsContent>

          {/* Import by URL */}
          <TabsContent value="url">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsFetching(true);
                try {
                  const res = await fetch(url);
                  if (!res.ok) throw new Error("Failed to fetch document");
                  const text = await res.text();
                  const isYaml = url.endsWith(".yml") || url.endsWith(".yaml") || text.trim().startsWith("openapi") || text.trim().startsWith("swagger") ? false : text.trim().startsWith("---");
                  const swaggerDoc = await parseSwaggerDocument(text, isYaml);
                  setSwaggerDoc(swaggerDoc);
                  toast({ title: "Document imported successfully", description: `Imported from URL: ${url}` });
                } catch (error) {
                  console.error("Error fetching/parsing Swagger document:", error);
                  toast({ title: "Error importing document", description: "Please ensure the URL points to a valid Swagger JSON or YAML document.", variant: "destructive" });
                } finally {
                  setIsFetching(false);
                }
              }}
              className="flex flex-col gap-5 p-6 border-2 border-gray-200 rounded-xl bg-white"
            >
              <div className="flex items-center gap-3 text-blue-600 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <h3 className="font-medium">Import from URL</h3>
              </div>
              <div className="space-y-2">
                <label htmlFor="url-input" className="text-sm text-gray-600">Enter the URL of a Swagger/OpenAPI document</label>
                <Input
                  id="url-input"
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/swagger.json"
                  disabled={isFetching}
                  required
                  className="border-gray-200 focus:border-blue-300 focus:ring-blue-200 transition-all duration-200"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isFetching || !url.trim()}
                className="bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg self-start mt-2"
              >
                <span className="flex items-center gap-2">
                  {isFetching ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Fetching...
                    </>
                  ) : (
                    <>Import from URL</>
                  )}
                </span>
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
