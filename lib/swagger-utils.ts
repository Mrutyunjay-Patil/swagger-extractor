import jsYaml from "js-yaml"

/**
 * Parse a Swagger document from JSON or YAML format
 */
export async function parseSwaggerDocument(content: string, isYaml: boolean): Promise<any> {
  try {
    if (isYaml) {
      return jsYaml.load(content)
    } else {
      return JSON.parse(content)
    }
  } catch (error) {
    console.error("Error parsing Swagger document:", error)
    throw new Error("Invalid Swagger document format")
  }
}

/**
 * Extract API documentation for a specific tag
 */
export function extractApiDocForTag(swaggerDoc: any, tagName: string): any {
  // Create a new document with the same metadata
  const extractedDoc: any = {
    swagger: swaggerDoc.swagger || swaggerDoc.openapi,
    info: { ...swaggerDoc.info },
    host: swaggerDoc.host,
    basePath: swaggerDoc.basePath,
    schemes: swaggerDoc.schemes,
    consumes: swaggerDoc.consumes,
    produces: swaggerDoc.produces,
    tags: swaggerDoc.tags?.filter((tag: any) => tag.name === tagName),
    paths: {},
    definitions: {},
    components: swaggerDoc.components ? { schemas: {} } : undefined,
  }

  // Filter paths that contain operations with the specified tag
  const paths = swaggerDoc.paths || {}
  const usedSchemas = new Set<string>()

  Object.keys(paths).forEach((path) => {
    const pathItem = paths[path]
    const operations = ["get", "post", "put", "delete", "options", "head", "patch"]
    let includePathItem = false

    operations.forEach((operation) => {
      if (pathItem[operation] && pathItem[operation].tags && pathItem[operation].tags.includes(tagName)) {
        includePathItem = true

        // Track schemas used in this operation
        collectSchemasFromOperation(pathItem[operation], usedSchemas, swaggerDoc)
      }
    })

    if (includePathItem) {
      // Only include operations that match the tag
      extractedDoc.paths[path] = {}

      operations.forEach((operation) => {
        if (pathItem[operation] && pathItem[operation].tags && pathItem[operation].tags.includes(tagName)) {
          extractedDoc.paths[path][operation] = pathItem[operation]
        }
      })
    }
  })

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

/**
 * Collect schemas referenced in an operation
 */
export function collectSchemasFromOperation(operation: any, usedSchemas: Set<string>, swaggerDoc: any) {
  // Check request body
  if (operation.requestBody) {
    const content = operation.requestBody.content
    if (content) {
      Object.values(content).forEach((mediaType: any) => {
        if (mediaType.schema) {
          extractSchemaRefs(mediaType.schema, usedSchemas)
        }
      })
    }
  }

  // Check parameters
  if (operation.parameters) {
    operation.parameters.forEach((param: any) => {
      if (param.schema) {
        extractSchemaRefs(param.schema, usedSchemas)
      }
    })
  }

  // Check responses
  if (operation.responses) {
    Object.values(operation.responses).forEach((response: any) => {
      if (response.schema) {
        extractSchemaRefs(response.schema, usedSchemas)
      }

      // OpenAPI 3.0 style
      if (response.content) {
        Object.values(response.content).forEach((mediaType: any) => {
          if (mediaType.schema) {
            extractSchemaRefs(mediaType.schema, usedSchemas)
          }
        })
      }
    })
  }
}

/**
 * Extract schema references from a schema object
 */
export function extractSchemaRefs(schema: any, usedSchemas: Set<string>) {
  if (!schema) return

  // Check for $ref
  if (schema.$ref) {
    const refParts = schema.$ref.split("/")
    const schemaName = refParts[refParts.length - 1]
    usedSchemas.add(schemaName)
  }

  // Check for array items
  if (schema.items) {
    extractSchemaRefs(schema.items, usedSchemas)
  }

  // Check for properties
  if (schema.properties) {
    Object.values(schema.properties).forEach((prop: any) => {
      extractSchemaRefs(prop, usedSchemas)
    })
  }
  // Check for allOf, anyOf, oneOf
  ;["allOf", "anyOf", "oneOf"].forEach((key) => {
    if (schema[key] && Array.isArray(schema[key])) {
      schema[key].forEach((subSchema: any) => {
        extractSchemaRefs(subSchema, usedSchemas)
      })
    }
  })
}

/**
 * Collect nested schemas from a schema object
 */
export function collectNestedSchemas(schema: any, usedSchemas: Set<string>, sourceSchemas: any, targetSchemas: any) {
  if (!schema) return

  // Check for properties
  if (schema.properties) {
    Object.values(schema.properties).forEach((prop: any) => {
      if (prop.$ref) {
        const refParts = prop.$ref.split("/")
        const schemaName = refParts[refParts.length - 1]

        if (!targetSchemas[schemaName] && sourceSchemas[schemaName]) {
          usedSchemas.add(schemaName)
          targetSchemas[schemaName] = sourceSchemas[schemaName]

          // Recursively collect nested schemas
          collectNestedSchemas(sourceSchemas[schemaName], usedSchemas, sourceSchemas, targetSchemas)
        }
      }

      // Check for array items
      if (prop.items && prop.items.$ref) {
        const refParts = prop.items.$ref.split("/")
        const schemaName = refParts[refParts.length - 1]

        if (!targetSchemas[schemaName] && sourceSchemas[schemaName]) {
          usedSchemas.add(schemaName)
          targetSchemas[schemaName] = sourceSchemas[schemaName]

          // Recursively collect nested schemas
          collectNestedSchemas(sourceSchemas[schemaName], usedSchemas, sourceSchemas, targetSchemas)
        }
      }
    })
  }
  // Check for allOf, anyOf, oneOf
  ;["allOf", "anyOf", "oneOf"].forEach((key) => {
    if (schema[key] && Array.isArray(schema[key])) {
      schema[key].forEach((subSchema: any) => {
        if (subSchema.$ref) {
          const refParts = subSchema.$ref.split("/")
          const schemaName = refParts[refParts.length - 1]

          if (!targetSchemas[schemaName] && sourceSchemas[schemaName]) {
            usedSchemas.add(schemaName)
            targetSchemas[schemaName] = sourceSchemas[schemaName]

            // Recursively collect nested schemas
            collectNestedSchemas(sourceSchemas[schemaName], usedSchemas, sourceSchemas, targetSchemas)
          }
        }
      })
    }
  })
}
