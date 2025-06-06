import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SwaggerDocumentProvider } from "@/components/swagger-document-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Swagger API Documentation Extractor",
  description: "Extract and download API documentation for specific tags from Swagger/OpenAPI documents",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <SwaggerDocumentProvider>
            {children}
            <Toaster />
          </SwaggerDocumentProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
