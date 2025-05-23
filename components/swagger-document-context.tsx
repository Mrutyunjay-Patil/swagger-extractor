"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Type for the swagger document (can be improved with a stricter type)
type SwaggerDoc = any;

interface SwaggerDocumentContextType {
  swaggerDoc: SwaggerDoc | null;
  setSwaggerDoc: (doc: SwaggerDoc | null) => void;
}

const SwaggerDocumentContext = createContext<SwaggerDocumentContextType | undefined>(undefined);

export function useSwaggerDocument() {
  const context = useContext(SwaggerDocumentContext);
  if (!context) {
    throw new Error("useSwaggerDocument must be used within a SwaggerDocumentProvider");
  }
  return context;
}

export function SwaggerDocumentProvider({ children }: { children: ReactNode }) {
  const [swaggerDoc, setSwaggerDocState] = useState<SwaggerDoc | null>(null);

  // On mount, load from localStorage if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("swaggerDocument");
      if (stored) {
        try {
          setSwaggerDocState(JSON.parse(stored));
        } catch {
          setSwaggerDocState(null);
        }
      }
    }
  }, []);

  // When swaggerDoc changes, persist to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (swaggerDoc) {
        localStorage.setItem("swaggerDocument", JSON.stringify(swaggerDoc));
      } else {
        localStorage.removeItem("swaggerDocument");
      }
    }
  }, [swaggerDoc]);

  const setSwaggerDoc = (doc: SwaggerDoc | null) => {
    setSwaggerDocState(doc);
  };

  return (
    <SwaggerDocumentContext.Provider value={{ swaggerDoc, setSwaggerDoc }}>
      {children}
    </SwaggerDocumentContext.Provider>
  );
}
