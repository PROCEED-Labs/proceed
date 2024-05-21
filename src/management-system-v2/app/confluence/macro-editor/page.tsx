'use client';

import Head from 'next/head';
import { useState, useEffect } from 'react';

const MacroEditor = () => {
  const [processId, setProcessId] = useState('');

  useEffect(() => {
    if (window.AP) {
      console.log('window AP', window.AP);
      window.AP.dialog.getCustomData((data) => {
        console.log('data', data);
        setProcessId(data.parameters?.processId || '');
      });
    }
  }, []);

  const saveMacro = () => {
    if (window.AP) {
      window.AP.dialog.close({ processId });
    }
  };

  return (
    <>
      <Head>
        <title>Proceed Macro Editor</title>
        <script src="https://connect-cdn.atlassian.com/all.js"></script>
      </Head>
      <div>Macro Editor</div>
      <label htmlFor="process-id">Process ID:</label>
      <input
        type="text"
        id="process-id"
        value={processId}
        onChange={(e) => setProcessId(e.target.value)}
      />
      <button onClick={saveMacro}>Save</button>
    </>
  );
};

export default MacroEditor;
