'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

// Fungsi untuk mengubah Markdown sederhana menjadi HTML
function simpleMarkdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-8 mb-4 border-b pb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-6 border-b pb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-muted text-red-600 rounded-sm font-mono text-sm">$1</code>') // Inline code
    .replace(/<kbd>(.*?)<\/kbd>/g, '<kbd class="px-2 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-md shadow-sm">$1</kbd>') // Keyboard tag
    .replace(/---/g, '<hr class="my-8" />')
    .replace(/^\s*[\*] (.*$)/gim, '<li>$1</li>') // Unordered list
    .replace(/^\s*\d+\. (.*$)/gim, '<li>$1</li>'); // Ordered list (treated as unordered for simplicity)

  // Wrap consecutive list items in <ul>
  html = html.replace(/(<li>.*<\/li>\s*)+/g, (match) => {
    return `<ul class="list-disc list-inside space-y-2 mb-4 pl-4">${match.trim()}</ul>`;
  });

  // Handle paragraphs
  html = html.split('\n').map(p => {
    const trimmed = p.trim();
    if (trimmed === '' || trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<hr')) {
      return p;
    }
    // Avoid wrapping list items in <p> tags
    if (trimmed.startsWith('<li>')) {
      return p;
    }
    return `<p class="mb-4 leading-relaxed">${p}</p>`;
  }).join('\n').replace(/\n/g, ''); // Join and remove extra newlines from processing

  return html;
}


export default async function PanduanPage() {
  // Path ke file PANDUAN.md
  const markdownPath = path.join(process.cwd(), 'PANDUAN.md');
  let contentHtml = '';
  let error = null;

  try {
    // Baca isi file
    const markdownContent = await fs.readFile(markdownPath, 'utf8');
    contentHtml = simpleMarkdownToHtml(markdownContent);
  } catch (e) {
    console.error("Gagal membaca file panduan:", e);
    error = 'File panduan tidak dapat dimuat. Silakan coba lagi nanti.';
  }

  return (
    <div className="flex flex-col gap-6">
       <PageHeader
        title="Panduan Penggunaan Aplikasi"
        description="Dokumentasi lengkap untuk semua fitur utama."
      />
      <Card>
        <CardContent className="p-6 md:p-8">
          {error ? (
            <p className="text-destructive text-center">{error}</p>
          ) : (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
