import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gánh Hát Lô Tô - Virtual Loto Show",
  description: "Trải nghiệm Lô Tô hội chợ truyền thống Việt Nam ngay trên điện thoại. Tạo phòng, mời bạn bè, quay số và hô kinh!",
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a12',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
