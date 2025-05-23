"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Download, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { extractApiDocForTag } from "@/lib/swagger-utils"

// Create a context to share the swagger document
import { createContext, useContext } from "react"
const SwaggerDocContext = createContext<any>(null)
const useSwaggerDoc = () => useContext(SwaggerDocContext)

export function SwaggerViewer() {
  const [swaggerDoc, setSwaggerDoc] = useState<any>(null)
  const [tags, setTags] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window !== "undefined") {
      try {
        const storedDoc = localStorage.getItem("swaggerDocument")
        if (storedDoc) {
          const parsedDoc = JSON.parse(storedDoc)
          setSwaggerDoc(parsedDoc)

          // Extract tags from the document
          if (parsedDoc.tags && Array.isArray(parsedDoc.tags)) {
            setTags(parsedDoc.tags.map((tag: any) => tag.name))
          } else {
            // If no tags are defined, extract unique tags from operations
            const uniqueTags = new Set<string>()
            const paths = parsedDoc.paths || {}

            Object.values(paths).forEach((pathItem: any) => {
              const operations = ["get", "post", "put", "delete", "options", "head", "patch"]

              operations.forEach((operation) => {
                if (pathItem[operation] && pathItem[operation].tags) {
                  pathItem[operation].tags.forEach((tag: string) => {
                    uniqueTags.add(tag)
                  })
                }
              })
            })

            setTags(Array.from(uniqueTags))
          }
        }
      } catch (error) {
        console.error("Error loading Swagger document:", error)
      }
    }
  }, [])

  if (!swaggerDoc) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Import a Swagger document to view and extract API documentation.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="custom-ui" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="custom-ui">API Explorer</TabsTrigger>
          <TabsTrigger value="raw-json">Raw JSON</TabsTrigger>
        </TabsList>
        <TabsContent value="custom-ui" className="border rounded-lg p-4">
          <CustomSwaggerUI swaggerDoc={swaggerDoc} />
        </TabsContent>
        <TabsContent value="raw-json" className="border rounded-lg p-4">
          <pre className="overflow-auto max-h-[600px] p-4 bg-gray-50 rounded-md">
            {JSON.stringify(swaggerDoc, null, 2)}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CustomSwaggerUI({ swaggerDoc }: { swaggerDoc: any }) {
  // Group endpoints by tags
  const endpointsByTag: Record<string, { path: string; method: string; operation: any }[]> = {}
  const paths = swaggerDoc.paths || {}

  // First, collect all tags from the document
  const allTags = new Set<string>()
  if (swaggerDoc.tags && Array.isArray(swaggerDoc.tags)) {
    swaggerDoc.tags.forEach((tag: any) => allTags.add(tag.name))
  }

  // Then organize endpoints by tags
  Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
    const methods = ["get", "post", "put", "delete", "patch", "options", "head"]

    methods.forEach((method) => {
      if (pathItem[method]) {
        const operation = pathItem[method]
        const operationTags = operation.tags || ["default"]

        operationTags.forEach((tag: string) => {
          allTags.add(tag)
          if (!endpointsByTag[tag]) {
            endpointsByTag[tag] = []
          }

          endpointsByTag[tag].push({
            path,
            method,
            operation,
          })
        })
      }
    })
  })

  return (
    <SwaggerDocContext.Provider value={swaggerDoc}>
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h2 className="text-xl font-bold mb-2">{swaggerDoc.info?.title || "API Documentation"}</h2>
          <p className="text-gray-600 mb-2">{swaggerDoc.info?.description || ""}</p>
          <div className="text-sm text-gray-500">
            {swaggerDoc.info?.version && <p>Version: {swaggerDoc.info.version}</p>}
            {swaggerDoc.host && <p>Host: {swaggerDoc.host}</p>}
            {swaggerDoc.basePath && <p>Base Path: {swaggerDoc.basePath}</p>}
          </div>
        </div>

        <div className="space-y-4">
          {Array.from(allTags)
            .sort()
            .map((tag) => (
              <TagSection
                key={tag}
                tag={tag}
                endpoints={endpointsByTag[tag] || []}
                tagDescription={getTagDescription(swaggerDoc, tag)}
              />
            ))}
        </div>
      </div>
    </SwaggerDocContext.Provider>
  )
}

function getTagDescription(swaggerDoc: any, tagName: string): string {
  if (swaggerDoc.tags && Array.isArray(swaggerDoc.tags)) {
    const tagObj = swaggerDoc.tags.find((t: any) => t.name === tagName)
    return tagObj?.description || ""
  }
  return ""
}

function TagSection({
  tag,
  endpoints,
  tagDescription,
}: {
  tag: string
  endpoints: { path: string; method: string; operation: any }[]
  tagDescription: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const swaggerDoc = useSwaggerDoc()

  const handleDownloadTag = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!swaggerDoc) return

    try {
      const extractedDoc = extractApiDocForTag(swaggerDoc, tag)
      const jsonString = JSON.stringify(extractedDoc, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })

      // Create a download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${tag}-api-doc.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "API documentation extracted",
        description: `Downloaded documentation for tag: ${tag}`,
      })
    } catch (error) {
      console.error("Error extracting API documentation:", error)
      toast({
        title: "Error extracting documentation",
        description: "An error occurred while extracting the API documentation.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div
        className="flex items-center justify-between p-4 bg-gray-100 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-semibold">{tag}</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleDownloadTag} className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
          />
        </div>
      </div>

      {isOpen && tagDescription && (
        <div className="px-4 py-2 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">{tagDescription}</p>
        </div>
      )}

      <div className={`divide-y ${!isOpen ? "hidden" : ""}`}>
        {endpoints.map((endpoint, index) => (
          <EndpointItem
            key={`${endpoint.path}-${endpoint.method}-${index}`}
            path={endpoint.path}
            method={endpoint.method}
            operation={endpoint.operation}
            tag={tag}
          />
        ))}
      </div>
    </div>
  )
}

function EndpointItem({
  path,
  method,
  operation,
  tag,
}: {
  path: string
  method: string
  operation: any
  tag: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const swaggerDoc = useSwaggerDoc()

  const handleDownloadEndpoint = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!swaggerDoc) return

    try {
      const extractedDoc = extractApiEndpoint(swaggerDoc, path, method, tag)
      const jsonString = JSON.stringify(extractedDoc, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })

      // Create a download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${path.replace(/\//g, "_")}-${method}-api-doc.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "API endpoint extracted",
        description: `Downloaded documentation for ${method.toUpperCase()} ${path}`,
      })
    } catch (error) {
      console.error("Error extracting API endpoint:", error)
      toast({
        title: "Error extracting endpoint",
        description: "An error occurred while extracting the API endpoint documentation.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="bg-white">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center overflow-hidden">
          <MethodBadge method={method} />
          <span className="ml-3 font-medium truncate">{path}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 hidden sm:inline">{operation.summary || ""}</span>
          <Button size="sm" variant="ghost" onClick={handleDownloadEndpoint} className="flex items-center gap-1">
            <Download className="h-4 w-4" />
          </Button>
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? "transform rotate-180" : ""}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="p-4 bg-gray-50 border-t">
          {operation.description && (
            <div className="mb-4">
              <p className="text-gray-700">{operation.description}</p>
            </div>
          )}

          {operation.parameters && operation.parameters.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Parameters</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">In</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Required</th>
                      <th className="px-3 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operation.parameters.map((param: any, index: number) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2 font-medium">{param.name}</td>
                        <td className="px-3 py-2">{param.in}</td>
                        <td className="px-3 py-2">{getParameterType(param)}</td>
                        <td className="px-3 py-2">{param.required ? "Yes" : "No"}</td>
                        <td className="px-3 py-2">{param.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {operation.responses && (
            <div>
              <h4 className="text-sm font-medium mb-2">Responses</h4>
              <div className="space-y-2">
                {Object.entries(operation.responses).map(([code, response]: [string, any]) => (
                  <div key={code} className="p-2 border rounded bg-white">
                    <div className="flex items-center">
                      <StatusCodeBadge code={code} />
                      <span className="ml-2">{response.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MethodBadge({ method }: { method: string }) {
  const colorMap: Record<string, string> = {
    get: "bg-blue-100 text-blue-800",
    post: "bg-green-100 text-green-800",
    put: "bg-yellow-100 text-yellow-800",
    delete: "bg-red-100 text-red-800",
    patch: "bg-purple-100 text-purple-800",
    options: "bg-gray-100 text-gray-800",
    head: "bg-gray-100 text-gray-800",
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${colorMap[method] || "bg-gray-100"}`}>
      {method}
    </span>
  )
}

function StatusCodeBadge({ code }: { code: string }) {
  let color = "bg-gray-100 text-gray-800"

  if (code.startsWith("2")) {
    color = "bg-green-100 text-green-800"
  } else if (code.startsWith("3")) {
    color = "bg-blue-100 text-blue-800"
  } else if (code.startsWith("4")) {
    color = "bg-yellow-100 text-yellow-800"
  } else if (code.startsWith("5")) {
    color = "bg-red-100 text-red-800"
  }

  return <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>{code}</span>
}

function getParameterType(param: any): string {
  if (param.type) {
    return param.type
  }

  if (param.schema) {
    if (param.schema.type) {
      return param.schema.type
    }
    if (param.schema.$ref) {
      const parts = param.schema.$ref.split("/")
      return parts[parts.length - 1]
    }
  }

  return "object"
}

function extractApiEndpoint(swaggerDoc: any, path: string, method: string, tag: string): any {
  // Create a new document with the same metadata
  const extractedDoc: any = {
    swagger: swaggerDoc.swagger || swaggerDoc.openapi,
    info: { ...swaggerDoc.info },
    host: swaggerDoc.host,
    basePath: swaggerDoc.basePath,
    schemes: swaggerDoc.schemes,
    consumes: swaggerDoc.consumes,
    produces: swaggerDoc.produces,
    tags: swaggerDoc.tags?.filter((t: any) => t.name === tag),
    paths: {},
    definitions: {},
    components: swaggerDoc.components ? { schemas: {} } : undefined,
  }

  // Add the specific path and method
  if (swaggerDoc.paths && swaggerDoc.paths[path]) {
    extractedDoc.paths[path] = {}
    if (swaggerDoc.paths[path][method]) {
      extractedDoc.paths[path][method] = swaggerDoc.paths[path][method]
    }
  }

  // Track schemas used in this operation
  const usedSchemas = new Set<string>()
  if (extractedDoc.paths[path] && extractedDoc.paths[path][method]) {
    collectSchemasFromOperation(extractedDoc.paths[path][method], usedSchemas, swaggerDoc)
  }

  // Add all referenced schemas
  if (swaggerDoc.definitions) {
    usedSchemas.forEach((schemaName) => {
      if (swaggerDoc.definitions[schemaName]) {
        extractedDoc.definitions[schemaName] = swaggerDoc.definitions[schemaName]

        // Also collect nested schemas
        collectNestedSchemas(
          swaggerDoc.definitions[schemaName],
          usedSchemas,
          swaggerDoc.definitions,
          extractedDoc.definitions,
        )
      }
    })
  } else if (swaggerDoc.components?.schemas) {
    usedSchemas.forEach((schemaName) => {
      if (swaggerDoc.components.schemas[schemaName]) {
        extractedDoc.components.schemas[schemaName] = swaggerDoc.components.schemas[schemaName]

        // Also collect nested schemas
        collectNestedSchemas(
          swaggerDoc.components.schemas[schemaName],
          usedSchemas,
          swaggerDoc.components.schemas,
          extractedDoc.components.schemas,
        )
      }
    })
  }

  return extractedDoc
}

function collectSchemasFromOperation(operation: any, usedSchemas: Set<string>, swaggerDoc: any) {
  if (operation.parameters) {
    operation.parameters.forEach((param: any) => {
      if (param.schema && param.schema.$ref) {
        const schemaName = param.schema.$ref.split("/").pop()
        if (schemaName) {
          usedSchemas.add(schemaName)
        }
      }
    })
  }

  if (operation.responses) {
    Object.values(operation.responses).forEach((response: any) => {
      if (response.schema && response.schema.$ref) {
        const schemaName = response.schema.$ref.split("/").pop()
        if (schemaName) {
          usedSchemas.add(schemaName)
        }
      }
    })
  }

  if (operation.requestBody?.content) {
    Object.values(operation.requestBody.content).forEach((content: any) => {
      if (content.schema && content.schema.$ref) {
        const schemaName = content.schema.$ref.split("/").pop()
        if (schemaName) {
          usedSchemas.add(schemaName)
        }
      }
    })
  }
}

function collectNestedSchemas(schema: any, usedSchemas: Set<string>, definitions: any, extractedDefinitions: any) {
  if (schema.properties) {
    Object.values(schema.properties).forEach((prop: any) => {
      if (prop.$ref) {
        const schemaName = prop.$ref.split("/").pop()
        if (schemaName && !usedSchemas.has(schemaName)) {
          usedSchemas.add(schemaName)
          if (definitions[schemaName]) {
            extractedDefinitions[schemaName] = definitions[schemaName]
            collectNestedSchemas(definitions[schemaName], usedSchemas, definitions, extractedDefinitions)
          }
        }
      }
    })
  }

  if (schema.items && schema.items.$ref) {
    const schemaName = schema.items.$ref.split("/").pop()
    if (schemaName && !usedSchemas.has(schemaName)) {
      usedSchemas.add(schemaName)
      if (definitions[schemaName]) {
        extractedDefinitions[schemaName] = definitions[schemaName]
        collectNestedSchemas(definitions[schemaName], usedSchemas, definitions, extractedDefinitions)
      }
    }
  }
}
