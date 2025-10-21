'use client';

import React, { useEffect, useRef } from 'react';

import Content from '@/components/content';
import { App, Space, Typography } from 'antd';
import { updateHtmlForm } from '@/lib/data/html-forms';
import useEditorStateStore, {
  EditorStoreProvider,
} from '@/components/html-form-editor/use-editor-state-store';
import HtmlFormEditor, { HtmlFormEditorRef } from '@/components/html-form-editor';
import { HtmlForm } from '@/lib/html-form-schema';

type FormViewProps = {
  data: HtmlForm;
};

const FormEditor: React.FC<FormViewProps> = ({ data }) => {
  const builder = useRef<HtmlFormEditorRef | null>(null);

  const { message } = App.useApp();

  const handleSave = async () => {
    const json = builder.current?.getJson();
    const html = builder.current?.getHtml();

    if (json && html) {
      const res = await updateHtmlForm(data.id, { json, html });
      if (res && 'error' in res) message.error(res.error.message);
    }
  };

  const { variables, updateVariables } = useEditorStateStore((state) => state);

  useEffect(() => {
    // initialize the variables in the editor
    updateVariables(data.variables);
  }, []);

  useEffect(() => {
    if (variables) {
      // store the variable changes made in the editor
      updateHtmlForm(data.id, { variables: variables }).then((res) => {
        if (res && 'error' in res) message.error(res.error.message);
      });
    }
  }, [variables]);

  return <HtmlFormEditor ref={builder} json={data.json} onChange={handleSave} />;
};

const FormView: React.FC<FormViewProps> = ({ data }) => {
  return (
    <Content
      headerLeft={
        <Typography.Text strong style={{ padding: '0 5px' }}>
          Form
        </Typography.Text>
      }
      headerCenter={
        <Typography.Text strong style={{ padding: '0 5px' }}>
          {data.name}
        </Typography.Text>
      }
    >
      <Space
        direction="vertical"
        size="large"
        style={{ display: 'flex', height: '100%', rowGap: 0 }}
      >
        <EditorStoreProvider>
          <FormEditor data={data} />
        </EditorStoreProvider>
      </Space>
    </Content>
  );
};

export default FormView;
