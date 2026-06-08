import "./globals.css";

export const metadata = {
  title: "Shelby Web3 Vault",
  description: "Secure Web3 Code Vault",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white font-mono">
        {children}
      </body>
    </html>
  );
}
