'use client';

import { useState, useEffect } from 'react';

const MacroEditor = () => {
  const [processId, setProcessId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('window', window);
      if (window.AP && window.AP.confluence) {
        console.log('window AP', window.AP);
        window.AP.confluence.getMacroData((data: any) => {
          console.log('confluence macroData', data);
          if (data) {
            setProcessId(data.processId || data.parameters?.processId || '');
          }
        });
      }
    }
  });

  const saveMacro = () => {
    // if (window.AP && window.AP.confluence) {
    //   window.AP.confluence.saveMacro({ processId });
    //   window.AP.confluence.closeMacroEditor();
    // }
    console.log('SAVE MACRO', processId);
    window.AP.dialog.close({ processId });
  };

  return (
    <>
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
