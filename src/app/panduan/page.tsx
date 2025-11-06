'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

// Fungsi untuk mengubah Markdown sederhana menjadi HTML
function simpleMarkdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 border-b pb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-4 mb-6 border-b pb-4">$1</h1>')
    .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/`(.*?)`/g, '<code class="px-2 py-1 bg-muted text-red-500 rounded-md font-mono text-sm">$1</code>') // Inline code
    .replace(/<kbd>(.*?)<\/kbd>/g, '<kbd class="px-2 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">$1</kbd>') // Keyboard tag
    .replace(/^\* (.*$)/gim, '<li class="ml-6">$1</li>') // Unordered list
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-6">$1</li>') // Ordered list (simple)
    .replace(/---/g, '<hr class="my-6" />'); 

  // Wrap list items in <ul> or <ol>
  html = html.replace(/<li class="ml-6">(.+?)<\/li>\s*(?=<li class="ml-6">|$)/gs, (match) => {
    return `<ul>${match}</ul>`;
  }).replace(/<\/ul>\s*<ul>/g, '');


  // Handle paragraphs
  html = html.split('\n').map(p => {
    if (p.trim() === '' || p.startsWith('<h') || p.startsWith('<li') || p.startsWith('<ul') || p.startsWith('<hr')) {
      return p;
    }
    return `<p class="mb-4 leading-relaxed">${p}</p>`;
  }).join('');

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
