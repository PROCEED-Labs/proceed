'use client';
import { useFileManager } from '@/lib/useFileManager';
import Image from 'next/image';
import { useState } from 'react';

const TestFileManager = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processId, setProcessId] = useState('test-process-id');
  const [fileName, setFileName] = useState('');
  const [fileLink, setFileLink] = useState('');
  const { upload, download, remove, isLoading, error, downloadUrl } = useFileManager();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }
    const { ok, fileName: uploadedFileName } = await upload(selectedFile, processId);
    if (ok) {
      setFileName(uploadedFileName);
      alert(`File uploaded successfully: ${uploadedFileName}`);
    } else {
      alert('File upload failed');
    }
  };

  const handleDownload = async () => {
    if (!fileName) {
      alert('Please enter the file name to download');
      return;
    }
    const { ok } = await download(processId, fileName);
    if (ok && downloadUrl) {
      //const link = document.createElement('a');
      setFileLink(downloadUrl);
      alert('File downloaded successfully');
    } else {
      alert('File download failed');
    }
  };

  const handleRemove = async () => {
    if (!fileName) {
      alert('Please enter the file name to delete');
      return;
    }
    const success = await remove(processId, fileName);
    if (success) {
      alert('File deleted successfully');
      setFileName('');
    } else {
      alert('File deletion failed');
    }
  };

  return (
    <div>
      <h1>File Manager Test Page</h1>
      <div>
        <label>Process ID:</label>
        <input type="text" value={processId} onChange={(e) => setProcessId(e.target.value)} />
      </div>
      <div>
        <label>Select File:</label>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={isLoading}>
          {isLoading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      <div>
        <label>File Name:</label>
        <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} />
        <button onClick={handleDownload} disabled={isLoading}>
          {isLoading ? 'Downloading...' : 'Download'}
        </button>
        <button onClick={handleRemove} disabled={isLoading}>
          {isLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>{fileLink ? <Image src={fileLink} alt={'image'} width={500} height={500} /> : null}</div>
    </div>
  );
};

export default TestFileManager;
