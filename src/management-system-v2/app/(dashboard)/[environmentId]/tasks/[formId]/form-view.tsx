'use client';

import React, { useEffect, useRef } from 'react';

import Content from '@/components/content';
import { HtmlForm } from '@prisma/client';
import { Space, Typography } from 'antd';
import { updateHtmlForm } from '@/lib/data/html-forms';
import useEditorStateStore from '@/components/html-form-editor/use-editor-state-store';
import HtmlFormEditor, { HtmlFormEditorRef } from '@/components/html-form-editor';

type FormViewProps = {
  data: HtmlForm;
};

const FormView: React.FC<FormViewProps> = ({ data }) => {
  const builder = useRef<HtmlFormEditorRef | null>(null);

  const handleSave = () => {
    const json = builder.current?.getJson();
    const html = builder.current?.getHtml();

    if (json && html) {
      updateHtmlForm(data.id, { json, html });
    }
  };

  const { variables, updateVariables } = useEditorStateStore();

  useEffect(() => {
    // initialize the variables in the editor
    updateVariables(JSON.parse(data.variables));
  }, []);

  useEffect(() => {
    if (variables) {
      // store the variable changes made in the editor
      updateHtmlForm(data.id, { variables: JSON.stringify(variables) });
    }
  }, [variables]);

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
        <HtmlFormEditor ref={builder} json={data.json} onChange={handleSave} />
      </Space>
    </Content>
  );
};

export default FormView;
