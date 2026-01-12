import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "스마트 코딩 비서 (Dev Assistant)",
  description: "개발 중 발생하는 에러, 코드, 아이디어를 기록하고 AI가 정리해주는 스마트 노트입니다.",
  keywords: ["코딩", "개발", "메모", "AI", "Gemini", "Firebase"],
  openGraph: {
    title: "스마트 코딩 비서",
    description: "개발자의 성장을 돕는 AI 기록 비서",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
