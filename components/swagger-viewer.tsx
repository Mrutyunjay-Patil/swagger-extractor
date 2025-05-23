"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Download, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { extractApiDocForTag } from "@/lib/swagger-utils"
import { useSwaggerDocument } from "@/components/swagger-document-context"

// Utility to generate a simple example from a JSON schema
function generateExampleFromSchema(schema: any, definitions: any = {}): any {
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return schema.enum[0];
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return generateExampleFromSchema(definitions?.[refName], definitions);
  }
  switch (schema.type) {
    case 'object': {
      const obj: any = {};
      if (schema.properties) {
        for (const key in schema.properties) {
          obj[key] = generateExampleFromSchema(schema.properties[key], definitions);
        }
      }
      return obj;
    }
    case 'array':
      return [generateExampleFromSchema(schema.items, definitions)];
    case 'string':
      return 'string';
    case 'integer':
      return 0;
    case 'number':
      return 0.0;
    case 'boolean':
      return true;
    default:
      return {};
  }
}

// Component to display the schema of a response (as JSON example or table)
function ResponseSchemaDisplay({ response, swaggerDoc }: { response: any; swaggerDoc: any }) {
  // OpenAPI 3: response.content[mediaType].schema
  let schema = null;
  let definitions = swaggerDoc.definitions || swaggerDoc.components?.schemas || {};
  if (response.content) {
    // Prefer application/json, fallback to first media type
    const mediaType = response.content['application/json']
      ? 'application/json'
      : Object.keys(response.content)[0];
    schema = response.content[mediaType]?.schema;
  } else if (response.schema) {
    // Swagger 2
    schema = response.schema;
  }
  if (!schema) return null;

  // Try to generate an example
  const example = generateExampleFromSchema(schema, definitions);

  // Render as JSON example
  return (
    <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-2 border-b border-gray-200 flex items-center">
        <div className="flex items-center gap-2 text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          <span className="font-medium text-sm">Response Example</span>
        </div>
      </div>
      <div className="bg-gray-50 font-mono text-xs text-gray-800 overflow-auto">
        <pre className="p-4 overflow-auto max-h-64 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {JSON.stringify(example, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// Component to display the request body schema and example
function RequestBodyDisplay({ requestBody, swaggerDoc }: { requestBody: any; swaggerDoc: any }) {
  let schema = null;
  let mediaType = null;
  let definitions = swaggerDoc.definitions || swaggerDoc.components?.schemas || {};
  if (requestBody.content) {
    // Prefer application/json, fallback to first media type
    mediaType = requestBody.content['application/json']
      ? 'application/json'
      : Object.keys(requestBody.content)[0];
    schema = requestBody.content[mediaType]?.schema;
  }
  if (!schema) return null;

  const example = generateExampleFromSchema(schema, definitions);

  return (
    <div className="mb-5">
      <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 3v4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3"></path></svg>
        Request Body Example
      </h4>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-2">
        <div className="p-4">
          <div className="mb-2 text-xs text-gray-600">
            <span className="font-semibold">Media type:</span> {mediaType}
          </div>
          <div className="bg-gray-50 font-mono text-xs text-gray-800 overflow-auto rounded">
            <pre className="p-4 overflow-auto max-h-64 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {JSON.stringify(example, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SwaggerViewer() {
  const { swaggerDoc } = useSwaggerDocument();
  const [tags, setTags] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!swaggerDoc) {
      setTags([]);
      return;
    }
    if (swaggerDoc.tags && Array.isArray(swaggerDoc.tags)) {
      setTags(swaggerDoc.tags.map((tag: any) => tag.name));
    } else {
      // If no tags are defined, extract unique tags from operations
      const uniqueTags = new Set<string>();
      const paths = swaggerDoc.paths || {};
      Object.values(paths).forEach((pathItem: any) => {
        const operations = ["get", "post", "put", "delete", "options", "head", "patch"];
        operations.forEach((operation) => {
          if (pathItem[operation] && pathItem[operation].tags) {
            pathItem[operation].tags.forEach((tag: string) => {
              uniqueTags.add(tag);
            });
          }
        });
      });
      setTags(Array.from(uniqueTags));
    }
  }, [swaggerDoc]);

  if (!swaggerDoc) {
    return (
      <Card className="shadow-lg border-none overflow-hidden bg-gradient-to-br from-blue-50 to-green-50 p-1">
        <CardContent className="p-12 text-center bg-white rounded-md">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <h3 className="text-xl font-medium text-gray-700">No Documentation Loaded</h3>
            <p className="text-gray-500 max-w-md">Import a Swagger document using one of the options above to view and extract API documentation.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="custom-ui" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-gradient-to-r from-blue-100 to-green-100 p-1 rounded-lg">
          <TabsTrigger value="custom-ui" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 transition-all duration-200">API Explorer</TabsTrigger>
          <TabsTrigger value="raw-json" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 transition-all duration-200">Raw JSON</TabsTrigger>
        </TabsList>
        <TabsContent value="custom-ui" className="shadow-md p-2 rounded-xl overflow-hidden bg-white">
          <CustomSwaggerUI swaggerDoc={swaggerDoc} />
        </TabsContent>
        <TabsContent value="raw-json" className="shadow-md rounded-xl overflow-hidden bg-white">
          <div className="overflow-auto max-h-[600px] p-6 bg-gradient-to-r from-slate-50 to-gray-50 font-mono text-sm">
            <pre className="text-gray-800">
              {JSON.stringify(swaggerDoc, null, 2)}
            </pre>
          </div>
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
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl shadow-sm border border-blue-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-blue-800">{swaggerDoc.info?.title || "API Documentation"}</h2>
            {swaggerDoc.info?.description && (
              <div className="text-gray-600 mb-3 max-w-3xl">{swaggerDoc.info?.description}</div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 text-sm bg-white p-3 rounded-lg shadow-sm border border-blue-100">
            {swaggerDoc.info?.version && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Version:</span>
                <span className="text-blue-600 font-mono">{swaggerDoc.info.version}</span>
              </div>
            )}
            {swaggerDoc.host && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Host:</span>
                <span className="text-blue-600 font-mono">{swaggerDoc.host}</span>
              </div>
            )}
            {swaggerDoc.basePath && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Base Path:</span>
                <span className="text-blue-600 font-mono">{swaggerDoc.basePath}</span>
              </div>
            )}
          </div>
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
              swaggerDoc={swaggerDoc}
            />
          ))}
      </div>
    </div>
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
  swaggerDoc,
}: {
  tag: string
  endpoints: { path: string; method: string; operation: any }[]
  tagDescription: string
  swaggerDoc: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

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
    <div className="rounded-xl overflow-hidden shadow-md border border-gray-100 transition-all duration-300 hover:shadow-lg">
      <div
        className={`flex items-center justify-between p-4 cursor-pointer transition-colors duration-200 ${isOpen ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white' : 'bg-gradient-to-r from-gray-50 to-slate-50 hover:from-blue-50 hover:to-green-50'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isOpen ? 'bg-white/20' : 'bg-blue-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isOpen ? 'text-white' : 'text-blue-600'}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          </div>
          <h3 className={`text-lg font-semibold ${isOpen ? 'text-white' : 'text-gray-800'}`}>{tag}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${isOpen ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
            {endpoints.length} {endpoints.length === 1 ? 'endpoint' : 'endpoints'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={isOpen ? "secondary" : "outline"} 
            onClick={handleDownloadTag} 
            className={`flex items-center gap-1 transition-all duration-200 ${isOpen ? 'bg-white/20 hover:bg-white/30 text-white border-white/20' : ''}`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "transform rotate-180 text-white" : "text-gray-500"}`}
          />
        </div>
      </div>

      {isOpen && tagDescription && (
        <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-green-50 border-b border-blue-100">
          <p className="text-sm text-gray-700">{tagDescription}</p>
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
            swaggerDoc={swaggerDoc}
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
  swaggerDoc,
}: {
  path: string
  method: string
  operation: any
  tag: string
  swaggerDoc: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

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
    <div className="bg-white transition-all duration-200 hover:bg-gray-50">
      <div
        className="flex items-center justify-between p-4 cursor-pointer border-l-4 transition-all duration-200 hover:border-blue-500"
        style={{ borderLeftColor: isOpen ? getMethodColor(method) : 'transparent' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center overflow-hidden max-w-[70%]">
          <MethodBadge method={method} />
          <span className="ml-3 font-medium truncate text-gray-800">{path}</span>
        </div>
        <div className="flex items-center gap-3">
          {operation.summary && (
            <span className="text-sm text-gray-500 hidden md:inline max-w-[200px] truncate">{operation.summary}</span>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleDownloadEndpoint} 
            className="flex items-center gap-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
          >
            <Download className="h-4 w-4" />
          </Button>
          <ChevronDown
            className={`h-5 w-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? "transform rotate-180 text-blue-500" : ""}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="p-6 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-100">
          {operation.description && (
            <div className="mb-5 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
              <p className="text-gray-700">{operation.description}</p>
            </div>
          )}

          {operation.parameters && operation.parameters.length > 0 && (
            <div className="mb-5">
              <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
                Parameters
              </h4>
              <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">In</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Required</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operation.parameters.map((param: any, index: number) => (
                      <tr key={index} className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-4 py-3 font-medium text-blue-600">{param.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">{param.in}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{getParameterType(param)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${param.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                            {param.required ? "Required" : "Optional"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{param.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Display request body if present (OpenAPI 3) */}
          {operation.requestBody && (
            <RequestBodyDisplay requestBody={operation.requestBody} swaggerDoc={swaggerDoc} />
          )}

          {operation.responses && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                Responses
              </h4>
              <div className="space-y-3">
                {Object.entries(operation.responses).map(([code, response]: [string, any]) => (
                  <div key={code} className="p-4 border rounded-lg bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center mb-2">
                      <StatusCodeBadge code={code} />
                      <span className="ml-3 font-medium text-gray-700">{response.description}</span>
                    </div>
                    <ResponseSchemaDisplay response={response} swaggerDoc={swaggerDoc} />
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

function getMethodColor(method: string): string {
  const colorMap: Record<string, string> = {
    get: '#3b82f6',    // blue-500
    post: '#10b981',   // emerald-500
    put: '#f59e0b',    // amber-500
    delete: '#ef4444', // red-500
    patch: '#8b5cf6',  // violet-500
    options: '#6b7280', // gray-500
    head: '#6b7280',    // gray-500
  }
  
  return colorMap[method] || '#6b7280';
}

function MethodBadge({ method }: { method: string }) {
  const colorMap: Record<string, { bg: string, text: string, border: string }> = {
    get: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
    post: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
    put: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
    delete: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
    patch: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
    options: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
    head: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
  }

  const colors = colorMap[method] || { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${colors.bg} ${colors.text} border ${colors.border} shadow-sm`}>
      {method}
    </span>
  )
}

function StatusCodeBadge({ code }: { code: string }) {
  let colors = { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };

  if (code.startsWith("2")) {
    colors = { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" };
  } else if (code.startsWith("3")) {
    colors = { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" };
  } else if (code.startsWith("4")) {
    colors = { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" };
  } else if (code.startsWith("5")) {
    colors = { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" };
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.bg} ${colors.text} border ${colors.border} shadow-sm flex items-center justify-center min-w-[48px]`}>
      {code}
    </span>
  )
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
  // Parameters (Swagger 2 & OpenAPI 3)
  if (operation.parameters) {
    operation.parameters.forEach((param: any) => {
      if (param.schema) {
        extractSchemaRefs(param.schema, usedSchemas);
      }
    });
  }

  // Responses (Swagger 2: response.schema, OpenAPI 3: response.content[mediaType].schema)
  if (operation.responses) {
    Object.values(operation.responses).forEach((response: any) => {
      // Swagger 2 style
      if (response.schema) {
        extractSchemaRefs(response.schema, usedSchemas);
      }
      // OpenAPI 3 style
      if (response.content) {
        Object.values(response.content).forEach((content: any) => {
          if (content.schema) {
            extractSchemaRefs(content.schema, usedSchemas);
          }
        });
      }
    });
  }

  // Request body (OpenAPI 3)
  if (operation.requestBody?.content) {
    Object.values(operation.requestBody.content).forEach((content: any) => {
      if (content.schema) {
        extractSchemaRefs(content.schema, usedSchemas);
      }
    });
  }
}

// Helper to recursively extract all $ref schema names (including allOf/oneOf/anyOf)
function extractSchemaRefs(schema: any, usedSchemas: Set<string>) {
  if (!schema) return;
  if (schema.$ref) {
    const schemaName = schema.$ref.split("/").pop();
    if (schemaName) usedSchemas.add(schemaName);
  }
  if (schema.items) {
    extractSchemaRefs(schema.items, usedSchemas);
  }
  if (schema.properties) {
    Object.values(schema.properties).forEach((prop: any) => {
      extractSchemaRefs(prop, usedSchemas);
    });
  }
  ["allOf", "anyOf", "oneOf"].forEach((key) => {
    if (schema[key] && Array.isArray(schema[key])) {
      schema[key].forEach((subSchema: any) => {
        extractSchemaRefs(subSchema, usedSchemas);
      });
    }
  });
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    extractSchemaRefs(schema.additionalProperties, usedSchemas);
  }
}


function collectNestedSchemas(schema: any, usedSchemas: Set<string>, definitions: any, extractedDefinitions: any) {
  if (!schema) return;
  // Recursively handle properties
  if (schema.properties) {
    Object.values(schema.properties).forEach((prop: any) => {
      collectNestedSchemas(prop, usedSchemas, definitions, extractedDefinitions);
    });
  }
  // Recursively handle array items
  if (schema.items) {
    collectNestedSchemas(schema.items, usedSchemas, definitions, extractedDefinitions);
  }
  // Recursively handle allOf/anyOf/oneOf
  ["allOf", "anyOf", "oneOf"].forEach((key) => {
    if (schema[key] && Array.isArray(schema[key])) {
      schema[key].forEach((subSchema: any) => {
        collectNestedSchemas(subSchema, usedSchemas, definitions, extractedDefinitions);
      });
    }
  });
  // Recursively handle additionalProperties
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    collectNestedSchemas(schema.additionalProperties, usedSchemas, definitions, extractedDefinitions);
  }
  // If this is a $ref, add and recurse
  if (schema.$ref) {
    const schemaName = schema.$ref.split("/").pop();
    if (schemaName && !usedSchemas.has(schemaName)) {
      usedSchemas.add(schemaName);
      if (definitions[schemaName]) {
        extractedDefinitions[schemaName] = definitions[schemaName];
        collectNestedSchemas(definitions[schemaName], usedSchemas, definitions, extractedDefinitions);
      }
    }
  }
}

