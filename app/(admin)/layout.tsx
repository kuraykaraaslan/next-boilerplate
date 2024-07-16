import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AUTH",
  description: "Designed by kuray karaaslan"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
        {children}
    </>
  );
}
