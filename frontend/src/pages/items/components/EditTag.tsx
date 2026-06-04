import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';
import { Flex, Input, Tag, theme, Tooltip } from 'antd';
import { TweenOneGroup } from 'rc-tween-one';
import { resolveUrl, resolveTagUrl, resolveTagColor, } from '@/utils/resource';
import { configConsumerProps } from 'antd/es/config-provider';

const tagInputStyle: React.CSSProperties = {
  width: 128,
  height: 22,
  marginInlineEnd: 8,
  verticalAlign: 'top',
};

interface EditTagProps {
  tagList?: [] | undefined,
  tags?: string[] | undefined,
  setTags?: any | undefined,
  onChange?: any | undefined,
}


const EditTag: React.FC<PropsWithChildren<EditTagProps>> = (props : EditTagProps) => {
  const { token } = theme.useToken();
  const { tagList, tags, setTags, onChange } = props;
  // const [tags, setTags] = useState<string[]>(oldTag);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [editInputIndex, setEditInputIndex] = useState(-1);
  const [editInputValue, setEditInputValue] = useState('');
  const inputRef = useRef<InputRef>(null);
  const editInputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  useEffect(() => {
    editInputRef.current?.focus();
  }, [editInputValue]);

  useEffect(() => {
    if(onChange) {
      onChange(tags);
    }
  }, [tags]);

  const handleClose = (removedTag: string) => {
    const newTags = tags.filter((tag) => tag !== removedTag);
    setTags(newTags);
  };

  const showInput = () => {
    setInputVisible(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputConfirm = () => {
    if (inputValue && !tags.includes(inputValue)) {
      setTags([...tags, inputValue]);
    }
    setInputVisible(false);
    setInputValue('');
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditInputValue(e.target.value);
  };

  const handleEditInputConfirm = () => {
    if (editInputValue && !tags.includes(editInputValue)) {
      const newTags = [...tags];
      newTags[editInputIndex] = editInputValue;
      setTags(newTags);
    }
    setEditInputIndex(-1);
    setEditInputValue('');
  };

  const tagPlusStyle: React.CSSProperties = {
    height: 22,
    background: token.colorBgContainer,
    borderStyle: 'dashed',
  };

  return (
    <Flex gap="small" wrap>
      
      {tags.map<React.ReactNode>((tag, index) => {
        const isLongTag = tag.length > 20;
        const tagElem = (
          editInputIndex !== index ?
          <Tag
            key={index}
            closable={index >= 0}
            style={{ userSelect: 'none' }}
            color={resolveTagColor('tag', index)}
            onClose={(e) => { e.preventDefault(); handleClose(tag); }}
            variant="outlined"
          >
            <span
              onDoubleClick={(e) => {
                if (index >= 0) {
                  setEditInputIndex(index);
                  setEditInputValue(tag);
                  e.preventDefault();
                }
              }}
            >
              {isLongTag ? `${tag.slice(0, 20)}...` : tag}
            </span>
          </Tag>
          :
          <span key={tag}>
          <Input
            key={tag}
            ref={editInputRef}
            size="small"
            style={tagInputStyle}
            value={editInputValue}
            onChange={handleEditInputChange}
            onBlur={handleEditInputConfirm}
            onPressEnter={handleEditInputConfirm}
          />
          </span>
        );
        return isLongTag ? (
          <Tooltip title={tag} key={tag} color={token.colorPrimary}>
            {tagElem}
          </Tooltip>
        ) : (
          tagElem
        );
      })}
      
      {inputVisible ? (
        <Input
          ref={inputRef}
          type="text"
          size="small"
          style={tagInputStyle}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputConfirm}
          onPressEnter={handleInputConfirm}
        />
      ) : (
        <Tag style={tagPlusStyle} icon={<PlusOutlined />} onClick={showInput}>
          New Tag
        </Tag>
      )}
    </Flex>
  );
};

export default EditTag;