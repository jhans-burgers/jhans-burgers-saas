import React, { useCallback, useState } from 'react';
import { Upload, FileArchive, FolderInput } from 'lucide-react';

interface ZipUploaderProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
}

const ZipUploader: React.FC<ZipUploaderProps> = ({ onUpload, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/zip' || file.name.endsWith('.zip'))) {
      onUpload(file);
    } else {
      alert("Please upload a valid .zip file");
    }
  }, [onUpload, isProcessing]);

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return;
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div 
        className={`
            w-full max-w-xl border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden group
            ${isProcessing ? 'border-blue-500/50 bg-blue-500/5 cursor-wait' : 
              isDragging ? 'border-blue-400 bg-blue-500/10 scale-[1.02] shadow-2xl shadow-blue-500/20' : 
              'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800 cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".zip" 
          onChange={handleChange} 
          className="hidden" 
          id="zip-input"
          disabled={isProcessing}
        />
        <label htmlFor="zip-input" className="cursor-pointer flex flex-col items-center w-full h-full relative z-10">
          {isProcessing ? (
            <div className="animate-pulse flex flex-col items-center">
              <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full"></div>
                  <FolderInput className="w-20 h-20 text-blue-400 mb-6 relative z-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Analyzing Project...</h3>
              <p className="text-slate-400">Extracting structure and preparing AI context</p>
            </div>
          ) : (
            <>
              <div className={`p-6 rounded-full mb-6 transition-all duration-300 ${isDragging ? 'bg-blue-500/20' : 'bg-slate-700/50 group-hover:bg-slate-700'}`}>
                <Upload className={`w-12 h-12 transition-colors ${isDragging ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`} />
              </div>
              <h3 className="text-3xl font-black text-white mb-3">Upload Project</h3>
              <p className="text-slate-400 max-w-xs mx-auto mb-8 leading-relaxed">
                Drag & drop your project <b>.zip</b> file here to verify structure and analyze code.
              </p>
              <span className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0">
                Choose File
              </span>
            </>
          )}
        </label>
      </div>
      
      {!isProcessing && (
          <div className="mt-8 text-center space-y-2">
              <p className="text-slate-500 text-xs font-mono">SUPPORTED: JS, TS, PY, JAVA, C++, GO, RS, JSON, MD</p>
              <p className="text-slate-600 text-[10px]">Max file size: 50MB</p>
          </div>
      )}
    </div>
  );
};

export default ZipUploader;