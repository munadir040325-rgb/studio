import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Pratinjau Cetak',
  description: 'Pratinjau laporan sebelum dicetak.',
};

export default function PrintLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A layout file should not render its own <html> and <body> tags.
  // Only the root layout does that.
  // We wrap the children in a div with the necessary print styles.
  return (
    <div className="bg-white print:bg-white">
      {children}
    </div>
  );
}
