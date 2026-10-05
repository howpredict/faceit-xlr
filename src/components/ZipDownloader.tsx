import React, { useState } from 'react';
import { downloadExtensionZip } from '../utils/zipHelper';
import { Download, CheckCircle2, Chrome, Sparkles, Copy, Check } from 'lucide-react';

interface ZipDownloaderProps {
  onSuccess?: () => void;
}

export const ZipDownloader: React.FC<ZipDownloaderProps> = ({ onSuccess }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadExtensionZip();
      setDownloaded(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setDownloading(false);
    }
  };

  const copyUrl = (text: string, stepId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 lg:p-6 flex flex-col gap-6">
      {/* Download Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold w-fit mx-auto md:mx-0">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Все иконки PNG (16, 32, 48, 128) включены в архив</span>
            </div>

            <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Готовая сборка FACEIT XLR v2.1.0
            </h2>

            <p className="text-sm text-neutral-400 leading-relaxed">
              Ошибка <code className="text-orange-400 bg-neutral-800 px-1 rounded">Could not load icon 'icons/16.png'</code> полностью решена.
              В архив включены все 4 сгенерированных файла иконок, исправленный манифест, рабочая кнопка Discord и тёмная тема.
            </p>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-xl shadow-orange-500/25 transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
          >
            {downloading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Генерация архива...</span>
              </>
            ) : downloaded ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>Архив скачан! Скачать снова</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Скачать расширение (.ZIP)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4-Step Visual Installation Guide */}
      <div className="flex flex-col gap-4">
        <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Chrome className="w-5 h-5 text-orange-500" />
          <span>Как правильно установить в Chrome:</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col gap-2">
            <span className="text-xs font-mono font-bold text-orange-500">ШАГ 1</span>
            <h4 className="text-sm font-bold text-white">Распакуйте .ZIP</h4>
            <p className="text-xs text-neutral-400">
              Скачайте архив и распакуйте его в удобную папку на ПК, чтобы внутри лежали <code className="text-neutral-200">manifest.json</code> и папка <code className="text-neutral-200">icons/</code>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col gap-2">
            <span className="text-xs font-mono font-bold text-orange-500">ШАГ 2</span>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">chrome://extensions</h4>
              <button
                onClick={() => copyUrl('chrome://extensions', 2)}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                title="Скопировать"
              >
                {copiedStep === 2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-xs text-neutral-400">
              Откройте вкладку <code className="bg-neutral-800 px-1 rounded text-neutral-200">chrome://extensions</code> в браузере.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col gap-2">
            <span className="text-xs font-mono font-bold text-orange-500">ШАГ 3</span>
            <h4 className="text-sm font-bold text-white">Режим разработчика</h4>
            <p className="text-xs text-neutral-400">
              В правом верхнем углу включите тумблер <b>«Режим разработчика»</b> (Developer mode).
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col gap-2">
            <span className="text-xs font-mono font-bold text-orange-500">ШАГ 4</span>
            <h4 className="text-sm font-bold text-white">Загрузить распакованное</h4>
            <p className="text-xs text-neutral-400">
              Нажмите кнопку <b>«Загрузить распакованное»</b> и укажите распакованную папку. Теперь ошибок не будет!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
