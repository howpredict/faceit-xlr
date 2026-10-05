import React, { useState } from 'react';
import { EXTENSION_FILES, ExtensionFile } from '../data/extensionCode';
import { Copy, Check, FileCode, FileText, Info } from 'lucide-react';

export const CodeInspector: React.FC = () => {
  const [selectedFileName, setSelectedFileName] = useState<string>('popup.html');
  const [copied, setCopied] = useState(false);

  const selectedFile = EXTENSION_FILES[selectedFileName] || EXTENSION_FILES['popup.html'];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 lg:p-6 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-orange-500" />
            <span>Инспектор файлов расширения</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Просматривайте и копируйте исходный код любого файла из обновлённого расширения FACEIT XLR
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-all cursor-pointer w-fit"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
          <span>{copied ? 'Скопировано в буфер!' : 'Скопировать файл'}</span>
        </button>
      </div>

      {/* File Selector Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
        {Object.keys(EXTENSION_FILES).map((fileName) => {
          const isSelected = selectedFileName === fileName;
          return (
            <button
              key={fileName}
              onClick={() => {
                setSelectedFileName(fileName);
                setCopied(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-neutral-800 text-white shadow-xs border border-neutral-700 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              {fileName.endsWith('.json') || fileName.endsWith('.js') ? (
                <FileCode className="w-3.5 h-3.5 text-orange-500" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{fileName}</span>
            </button>
          );
        })}
      </div>

      {/* File Info Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-neutral-900/40 border border-neutral-800 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-orange-500" />
          <span>{selectedFile.description}</span>
        </div>
        <span className="font-mono text-[11px] text-neutral-500">
          {selectedFile.content.split('\n').length} строк · {(selectedFile.content.length / 1024).toFixed(1)} КБ
        </span>
      </div>

      {/* Code Editor Preview */}
      <div className="relative rounded-xl border border-neutral-800 bg-[#0d0f13] overflow-hidden shadow-2xl">
        <pre className="p-4 text-xs font-mono text-neutral-200 overflow-x-auto max-h-[480px] leading-relaxed selection:bg-orange-500 selection:text-white">
          <code>{selectedFile.content}</code>
        </pre>
      </div>
    </div>
  );
};
