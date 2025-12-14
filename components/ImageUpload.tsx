import React, { useRef } from 'react';
import { FileWithPreview } from '../types';
import { ImagePlus, X } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  description?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, files, onFilesChange, maxFiles = 5, description }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: FileWithPreview[] = [];
      const fileList: File[] = Array.from(e.target.files);
      
      // Prevent exceeding max files
      const remainingSlots = maxFiles - files.length;
      const filesToProcess = fileList.slice(0, remainingSlots);

      for (const file of filesToProcess) {
        const base64 = await convertToBase64(file);
        newFiles.push({
          file,
          preview: URL.createObjectURL(file),
          base64,
          mimeType: file.type
        });
      }
      onFilesChange([...files, ...newFiles]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const removeFile = (index: number) => {
    const updated = [...files];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    onFilesChange(updated);
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-end mb-3">
        <div>
            <label className="block text-sm font-medium text-white/90 tracking-wide">{label}</label>
            {description && <p className="text-xs text-white/50 mt-0.5">{description}</p>}
        </div>
        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/5 border border-white/5 text-white/40">
            {files.length}/{maxFiles}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-4">
        {files.map((file, idx) => (
          <div key={idx} className="relative group w-24 h-24 rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/10 transition-transform hover:scale-105">
            <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <button
              onClick={() => removeFile(idx)}
              className="absolute top-1 right-1 bg-black/50 backdrop-blur-md text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        
        {files.length < maxFiles && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-2xl border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 flex flex-col items-center justify-center text-white/40 hover:text-white/80 transition-all duration-300 group"
          >
            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 mb-1 transition-colors">
                <ImagePlus size={18} />
            </div>
            <span className="text-[10px] font-medium">Add</span>
          </button>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/png, image/jpeg, image/webp"
        multiple={maxFiles > 1}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;