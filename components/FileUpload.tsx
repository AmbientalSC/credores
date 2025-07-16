
import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText, X, Loader } from 'lucide-react';
import { UploadedDocument } from '../types';

interface FileUploadProps {
  onFilesChange: (files: UploadedDocument[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange }) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const newFiles: UploadedDocument[] = Array.from(files).map(file => ({
        docName: file.name,
        storagePath: '',
        uploadedAt: new Date(),
        file: file,
        url: URL.createObjectURL(file)
    }));

    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);
    onFilesChange(updatedFiles);

    // Simulate upload delay
    setTimeout(() => setIsUploading(false), 1000);
  }, [uploadedFiles, onFilesChange]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleFileChange(event.dataTransfer.files);
  }, [handleFileChange]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const removeFile = (fileName: string) => {
    const newFiles = uploadedFiles.filter(f => f.docName !== fileName);
    setUploadedFiles(newFiles);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div 
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">Clique para enviar</span> ou arraste e solte
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">PDF ou JPG (máx. 5MB por arquivo)</p>
        <input 
          id="file-input"
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.jpg,.jpeg"
          onChange={(e) => handleFileChange(e.target.files)}
        />
      </div>

      {isUploading && (
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Loader className="animate-spin h-4 w-4 mr-2" />
          Enviando arquivos...
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-800 dark:text-gray-200">Arquivos Anexados:</h4>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-md border border-gray-200 dark:border-gray-700">
            {uploadedFiles.map((file, index) => (
              <li key={index} className="flex items-center justify-between p-3">
                <div className="flex items-center min-w-0">
                  <FileText className="h-6 w-6 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                  <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.docName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.docName)}
                  className="ml-4 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
