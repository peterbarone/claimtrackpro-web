// app/layout.tsx
export const metadata = {
  title: 'ClaimTrackPro',
  description: 'Claims portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
