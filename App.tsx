import React, { useState, useRef, useCallback } from 'react';
import { 
  SeamlessMethod, 
  TileFormat, 
  CropSettings, 
  AveragingSettings, 
  OutputFormat,
  ProcessResult 
} from './types';
import { processTexture } from './services/imageProcessing';
import { 
  ArrowPathIcon, 
  PhotoIcon, 
  AdjustmentsHorizontalIcon, 
  ScissorsIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function App() {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  // Settings
  const [method, setMethod] = useState<SeamlessMethod>(SeamlessMethod.SCATTERED);
  const [tileFormat, setTileFormat] = useState<TileFormat>(TileFormat.TWO);
  const [markSeams, setMarkSeams] = useState(false);
  
  // Advanced Settings
  const [crop, setCrop] = useState<CropSettings>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [averaging, setAveraging] = useState<AveragingSettings>({ intensity: 0, radius: 5 });
  
  // Output Settings
  const [outFormat, setOutFormat] = useState<OutputFormat>(OutputFormat.JPEG);
  const [quality, setQuality] = useState<number>(92);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      
      // Basic validation
      if (selected.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit.");
        return;
      }
      if (!selected.type.startsWith('image/')) {
        setError("Please select a valid image file.");
        return;
      }

      setFile(selected);
      setError(null);
      setResult(null);
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFilePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleProcess = useCallback(async () => {
    if (!filePreview || !file) {
      setError("Please upload an image first.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Small timeout to allow UI to render "Processing" state
    setTimeout(async () => {
      try {
        const res = await processTexture(
          filePreview,
          method,
          tileFormat,
          markSeams,
          crop,
          averaging,
          outFormat,
          quality
        );
        setResult(res);
      } catch (err) {
        console.error(err);
        setError("An error occurred while processing the image.");
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  }, [filePreview, file, method, tileFormat, markSeams, crop, averaging, outFormat, quality]);

  // UI Components
  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center space-x-2 mb-4 border-b border-slate-700 pb-2">
      <Icon className="w-5 h-5 text-indigo-400" />
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-sans selection:bg-indigo-500 selection:text-white">
      <header className="bg-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 w-8 h-8 rounded mr-3 flex items-center justify-center">S</span>
            Seamless Texture Generator
          </h1>
          <p className="mt-2 text-slate-400 text-sm">Convert photos into infinitely tileable textures instantly.</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Upload */}
          <section className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
            <SectionHeader icon={ArrowPathIcon} title="1. Upload Image" />
            <div 
              className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-indigo-500 hover:bg-slate-750 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <PhotoIcon className="w-12 h-12 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">
                {file ? file.name : "Click to select a file"}
              </p>
              <p className="text-xs text-slate-500 mt-1">JPEG, PNG, GIF up to 10MB</p>
            </div>
          </section>

          {/* 2. Main Settings */}
          <section className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
            <SectionHeader icon={AdjustmentsHorizontalIcon} title="2. Seamless Settings" />
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as SeamlessMethod)}
                >
                  <option value={SeamlessMethod.SCATTERED}>No.2 – Scattered Edges (Best for Photos)</option>
                  <option value={SeamlessMethod.MIRRORED}>No.1 – Simple Mirrored (Kaleidoscope)</option>
                  <option value={SeamlessMethod.PATCH_BASED}>No.3 – Patch-Based (Organic)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {method === SeamlessMethod.SCATTERED && "Offsets image and blends center over seams."}
                  {method === SeamlessMethod.MIRRORED && "Mirrors quadrants. Perfect seams, symmetric look."}
                  {method === SeamlessMethod.PATCH_BASED && "Randomly splatters patches. Good for dirt/grass."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tile Preview Format</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm outline-none"
                  value={tileFormat}
                  onChange={(e) => setTileFormat(Number(e.target.value))}
                >
                  <option value={1}>1 × 1 (Single)</option>
                  <option value={2}>2 × 2 (Standard)</option>
                  <option value={3}>3 × 3 (Dense)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Seam Highlighting</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm outline-none"
                  value={markSeams ? "on" : "off"}
                  onChange={(e) => setMarkSeams(e.target.value === "on")}
                >
                  <option value="off">Disabled</option>
                  <option value="on">Highlight Seams (Red Grid)</option>
                </select>
              </div>
            </div>
          </section>

          {/* 3. Advanced Settings */}
          <section className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
            <SectionHeader icon={ScissorsIcon} title="3. Adjustments" />
            
            {/* Cropping */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pre-Crop (Pixels)</label>
              <div className="grid grid-cols-2 gap-3">
                {['top', 'bottom', 'left', 'right'].map((side) => (
                   <div key={side} className="flex items-center">
                     <span className="w-12 text-xs text-slate-500 capitalize">{side}:</span>
                     <input 
                       type="number" 
                       className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                       value={crop[side as keyof CropSettings]}
                       onChange={(e) => setCrop({...crop, [side]: Math.max(0, parseInt(e.target.value) || 0)})}
                     />
                   </div>
                ))}
              </div>
            </div>

            {/* Averaging */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pre-Averaging (Light/Dark)</label>
              <div className="space-y-3">
                 <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Intensity</span>
                      <span>{averaging.intensity}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      value={averaging.intensity}
                      onChange={(e) => setAveraging({...averaging, intensity: parseInt(e.target.value)})}
                    />
                 </div>
                 {averaging.intensity > 0 && (
                   <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Blur Radius</span>
                        <span>{averaging.radius}px</span>
                      </div>
                      <input 
                        type="range" min="1" max="20" 
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        value={averaging.radius}
                        onChange={(e) => setAveraging({...averaging, radius: parseInt(e.target.value)})}
                      />
                   </div>
                 )}
              </div>
            </div>
          </section>

          {/* 4. Output & Action */}
          <section className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700 sticky bottom-4">
             <div className="flex items-center justify-between mb-4">
               <div>
                  <label className="text-sm font-medium mr-3">Format:</label>
                  <select 
                    value={outFormat} 
                    onChange={(e) => setOutFormat(e.target.value as OutputFormat)}
                    className="bg-slate-900 border border-slate-600 rounded text-sm p-1"
                  >
                    <option value={OutputFormat.JPEG}>JPEG</option>
                    <option value={OutputFormat.PNG}>PNG</option>
                  </select>
               </div>
               {outFormat === OutputFormat.JPEG && (
                 <div className="flex items-center">
                    <span className="text-xs mr-2 text-slate-400">Quality:</span>
                    <input 
                      type="number" min="1" max="100" 
                      value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value))}
                      className="w-16 bg-slate-900 border border-slate-600 rounded text-sm p-1"
                    />
                 </div>
               )}
             </div>

             <button
               onClick={handleProcess}
               disabled={isProcessing || !file}
               className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-lg transition-all
                 ${isProcessing || !file 
                   ? 'bg-slate-700 cursor-not-allowed text-slate-500' 
                   : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20 active:scale-95'
                 }`}
             >
               {isProcessing ? (
                 <span className="flex items-center justify-center">
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Processing...
                 </span>
               ) : "Generate Texture"}
             </button>
             
             {error && (
               <div className="mt-3 flex items-start text-red-400 text-sm bg-red-900/20 p-2 rounded">
                 <ExclamationCircleIcon className="w-5 h-5 mr-1 flex-shrink-0" />
                 {error}
               </div>
             )}
          </section>
        </div>

        {/* RIGHT COLUMN: Results */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Default State or Results */}
          {!result ? (
            <div className="h-full min-h-[400px] bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
               {filePreview ? (
                 <div className="space-y-4 text-center">
                    <img src={filePreview} alt="Preview" className="max-h-64 rounded shadow-lg border border-slate-600 max-w-full" />
                    <p className="text-sm">Source Image Loaded. Configure settings and click Generate.</p>
                 </div>
               ) : (
                 <>
                   <PhotoIcon className="w-16 h-16 mb-4 opacity-50" />
                   <p>Results will appear here</p>
                 </>
               )}
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              
              {/* 1. Tiled Preview (Big) */}
              <div className="bg-slate-800 p-1 rounded-xl shadow-2xl border border-slate-700">
                <div className="bg-slate-900 rounded-lg p-2 overflow-auto" style={{ maxHeight: '600px' }}>
                   <img src={result.previewUrl} alt="Tiled Preview" className="w-full h-auto block" />
                </div>
                <div className="p-4 flex justify-between items-center bg-slate-800 rounded-b-xl">
                   <div>
                     <h3 className="text-lg font-bold text-white flex items-center">
                       <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                       Tiled Preview ({tileFormat}×{tileFormat})
                     </h3>
                     <p className="text-sm text-slate-400">Check this for visible seams.</p>
                   </div>
                   <a 
                     href={result.previewUrl} 
                     download={`tiled_preview.${outFormat === OutputFormat.JPEG ? 'jpg' : 'png'}`}
                     className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
                   >
                     Download Preview
                   </a>
                </div>
              </div>

              {/* 2. Single Texture (Small) */}
              <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col sm:flex-row gap-6">
                 <div className="shrink-0">
                    <img src={result.seamlessUrl} alt="Result" className="w-48 h-48 object-cover rounded border border-slate-600 bg-slate-900" />
                 </div>
                 <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-white mb-2">Seamless Texture</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      This is your final processed image ready for use.
                      <br/>
                      Dimensions: <span className="text-indigo-400 font-mono">{result.width} x {result.height}</span>
                    </p>
                    <a 
                     href={result.seamlessUrl} 
                     download={`seamless_texture.${outFormat === OutputFormat.JPEG ? 'jpg' : 'png'}`}
                     className="inline-block w-fit px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded transition-colors"
                   >
                     Download Texture
                   </a>
                 </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}