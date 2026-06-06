import { CONFIG } from '@/constants';
import lsdbServices from '@/services/lsdb';
import { apiRequest, getToken } from '@/services/lsdb/client';
import { openFolder } from '@/services/lsdb/LsdbController';
import { resolvePath, resolveUrl } from '@/utils/resource';
import {
  CloseCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  SmileOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  DrawerForm,
  ProForm,
  ProFormDatePicker,
  ProFormFieldSet,
  ProFormInstance,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormUploadButton,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Image, Popconfirm, Skeleton } from 'antd';
import dayjs from 'dayjs';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/dist/photoswipe.css';
import { useEffect, useRef, useState } from 'react';
import EditTag from './EditTag';

const { queryItem, updateItem, newItem, faviItem } =
  lsdbServices.LsdbController;

interface EditItemProps {
  loading?: boolean;
  fromItemData?: any;

  drawerVisit?: any;
  setDrawerVisit?: any;
  refreshItemClick?: any;
  showMessage?: any;
}

const EditItem = (props: EditItemProps) => {
  const intl = useIntl();

  const {
    loading,
    fromItemData,
    drawerVisit,
    setDrawerVisit,
    refreshItemClick,
    showMessage,
  } = props;
  const [itemData, setItemData] = useState<any>({});
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [previewSrc, setPreviewSrc] = useState<string>();
  const [previewThumbSrc, setPreviewThumbSrc] = useState<string>();
  const [updating, setUpdating] = useState<boolean>(false);
  const [processing, setProcessing] = useState<String>('');
  const formRef = useRef<ProFormInstance>();

  const [tags, setTags] = useState<string[]>([]);
  const [tags2, setTags2] = useState<string[]>([]);
  const [tags3, setTags3] = useState<string[]>([]);
  const [imageSwapOption, setImageSwapOption] = useState<any>();
  const [videoOption, setVideoOption] = useState<any>();

  const resetValues = function () {
    const newTags: string[] = [];
    const newTags2: string[] = [];
    const newTags3: string[] = [];
    itemData?.tagList?.forEach((value: any, index) => {
      if (value.type === 'tag') {
        newTags.push(value.value);
      } else if (value.type === 'tag2') {
        newTags2.push(value.value);
      } else if (value.type === 'tag3') {
        newTags3.push(value.value);
      }
    });
    setTags(newTags);
    setTags2(newTags2);
    setTags3(newTags3);
    formRef.current?.resetFields();

    const option: any = {};
    option.dataSource = itemData?.uploadImage;
    setImageSwapOption(option);

    setUpdating(false);
  };

  useEffect(() => {
    setItemData(fromItemData);
  }, [fromItemData]);

  useEffect(() => {
    resetValues();
  }, [itemData]);

  useEffect(() => {
    let player: any;
    videoOption?.udfUrl &&
      (player = new Player({
        id: 'xplayerPreview',
        fluid: true,
        volume: 0.2,
        url: videoOption?.udfUrl,
      }));
    return () => {
      player?.pause();
      player?.destroy();
    };
  }, [videoOption]);

  const getUploadValues = function (data: any) {
    let upload: any = [];
    data?.fileList?.forEach((value: any, index: number) => {
      if (value?.type === 'file') {
        let uploadItem: any = {};
        // uploadItem.uid = index;
        uploadItem.name = value?.value;
        uploadItem.status = 'done';
        if (value?.thumbUrl) {
          uploadItem.thumbUrl = value?.thumbUrl;
        }
        uploadItem.url = resolveUrl(
          data?.base,
          data?.category,
          data?.subcategory,
          data?.name,
          value?.value,
        );
        upload.push(uploadItem);
      }
    });
    return upload;
  };

  const getUploadImages = function (data: any) {
    let upload: any = [];
    data?.imgList?.forEach((value: any, index: number) => {
      if (value?.type !== 'file') {
        let uploadItem: any = {};
        // uploadItem.uid = index;
        uploadItem.index = index;
        uploadItem.name = value?.value;
        uploadItem.status = 'done';
        uploadItem.url = resolveUrl(
          data?.base,
          data?.category,
          data?.subcategory,
          data?.name,
          value?.value,
        );
        uploadItem.src = uploadItem.url;
        uploadItem.width = value?.width;
        uploadItem.height = value?.height;
        upload.push(uploadItem);
      }
    });
    return upload;
  };

  async function saveItem() {
    setProcessing('save');
    setUpdating(true);
    const values = formRef.current?.getFieldsFormatValue?.();
    const data = { ...values };
    // Cleared ProFormSelect values are omitted by getFieldsFormatValue; backend needs "" to clear.
    (['thumbnail', 'roll', 'trailer'] as const).forEach((field) => {
      if (!(field in data)) {
        data[field] = formRef.current?.getFieldValue(field) ?? '';
      }
    });
    data.tags = tags;
    data.tags2 = tags2;
    data.tags3 = tags3;
    showMessage({
      key: 'itemUpdate',
      type: 'loading',
      content: 'Update in progress..',
      duration: 0,
    });
    try {
      const { success, message } =
        itemData?.id > 0
          ? await updateItem(itemData?.id, data)
          : await newItem(data);
      if (success) {
        showMessage({
          key: 'itemUpdate',
          type: 'success',
          content: 'Updated!',
          duration: 2,
        });
        setUpdating(false);
        await refreshItem();
      } else {
        showMessage({
          key: 'itemUpdate',
          type: 'error',
          content: message,
          duration: 2,
        });
        setUpdating(false);
      }
    } catch (error) {
      showMessage({
        key: 'itemUpdate',
        type: 'error',
        content: 'Failed',
        duration: 2,
      });
      setUpdating(false);
    }
    setProcessing('');
  }

  async function refreshItem() {
    if (refreshItemClick) {
      await refreshItemClick();
    } else {
      const { data, success } = await queryItem(itemData?.id, {});
      if (success) {
        data.upload = getUploadValues(data);
        data.uploadImage = getUploadImages(data);
        setItemData(data);
        resetValues();
      }
    }
  }
  async function resetItem() {
    setProcessing('reset');
    setUpdating(true);
    showMessage({
      key: 'itemReset',
      type: 'loading',
      content: 'Refresh in progress..',
      duration: 0,
    });
    try {
      await refreshItem();
      showMessage({
        key: 'itemReset',
        type: 'success',
        content: 'Refreshed!',
        duration: 2,
      });
    } catch (error) {
      showMessage({
        key: 'itemReset',
        type: 'error',
        content: 'Failed',
        duration: 2,
      });
    }
    setProcessing('');
  }

  const openFolderClick = async () => {
    setProcessing('open');
    try {
      const res = await openFolder(
        resolvePath(
          undefined,
          itemData?.base,
          itemData?.category,
          itemData?.subcategory,
          itemData?.name,
          '',
        ),
      );
      if (res?.success) {
        showMessage({
          key: 'itemUpdate',
          type: 'info',
          content: 'success',
          duration: 2,
        });
      } else {
        showMessage({
          key: 'itemUpdate',
          type: 'error',
          content: res?.message || 'Failed to open folder',
          duration: 2,
        });
      }
    } catch (err) {
      console.error(err);
    }
    const timer = setTimeout(() => {
      setProcessing('');
    }, 1000);
  };

  return (
    <DrawerForm
      onOpenChange={setDrawerVisit}
      title={intl.formatMessage({ id: itemData?.id > 0 ? 'edit' : 'new' })}
      open={drawerVisit}
      layout="horizontal"
      formRef={formRef}
      submitter={{
        render: (props, defaultDoms) => {
          return [
            <Button
              key="extra-cancel"
              type="primary"
              danger
              ghost
              disabled={updating}
              icon={<CloseCircleOutlined />}
              onClick={() => {
                setDrawerVisit(false);
              }}
            >
              {intl.formatMessage({ id: 'cancel' })}
            </Button>,
            <Button
              key="extra-open"
              type="primary"
              loading={processing == 'open'}
              disabled={processing != '' && processing != 'open'}
              danger
              ghost
              icon={<FolderOpenOutlined />}
              onClick={() => {
                openFolderClick();
              }}
            >
              {intl.formatMessage({
                id: 'open',
              })}
            </Button>,
            <Button
              key="extra-reset"
              type="primary"
              danger
              ghost
              loading={processing == 'reset'}
              disabled={processing != '' && processing != 'reset'}
              icon={<UndoOutlined />}
              onClick={() => {
                resetItem();
                // props.form?.resetFields();
              }}
            >
              {intl.formatMessage({ id: 'reset' })}
            </Button>,
            <Button
              key="extra-save"
              type="primary"
              danger
              ghost
              loading={processing == 'save'}
              disabled={processing != '' && processing != 'save'}
              icon={<SaveOutlined />}
              onClick={() => {
                saveItem();
              }}
            >
              {intl.formatMessage({ id: 'save' })}
            </Button>,
          ];
        },
      }}
      onFinish={async (values) => console.log(values)}
    >
      <Skeleton loading={updating}>
        {!(itemData?.id > 0) ? (
          <>
            <ProFormText
              name="base"
              label={intl.formatMessage({ id: 'base' })}
              initialValue={itemData?.base}
            />
            <ProFormText
              name="category"
              label={intl.formatMessage({ id: 'category' })}
              initialValue={itemData?.category}
            />
            <ProFormText
              name="subcategory"
              label={intl.formatMessage({ id: 'subcategory' })}
              initialValue={itemData?.subcategory}
            />
            <ProFormText
              name="name"
              label={intl.formatMessage({ id: 'name' })}
              initialValue={itemData?.name}
            />
          </>
        ) : (
          ''
        )}
        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'title' })}
          initialValue={itemData?.title}
        />
        <ProForm.Group>
          <ProFormDatePicker
            name="date"
            label={intl.formatMessage({ id: 'date' })}
            initialValue={dayjs(itemData?.date)}
          />
          {previewThumbSrc?.endsWith('video.svg') ? (
            <Image
              width={0}
              style={{ display: 'none' }}
              src=""
              preview={{
                visible: previewVisible,
                scaleStep: 1,
                src: previewSrc,
                onVisibleChange: (value) => {
                  setPreviewVisible(value);
                },
                imageRender: () => (
                  <video
                    muted
                    controls
                    style={{ maxWidth: '100%' }}
                    src={previewSrc}
                  />
                ),
                toolbarRender: () => null,
              }}
            ></Image>
          ) : (
            <Image
              width={0}
              style={{ display: 'none' }}
              src=""
              preview={{
                visible: previewVisible,
                scaleStep: 1,
                src: previewSrc,
                onVisibleChange: (value) => {
                  setPreviewVisible(value);
                },
              }}
            ></Image>
          )}
        </ProForm.Group>
        <ProFormTextArea
          name="content"
          label={intl.formatMessage({ id: 'content' })}
          initialValue={itemData?.content}
          fieldProps={{ autoSize: { minRows: 5, maxRows: 10 } }}
        />
        <ProFormFieldSet label={intl.formatMessage({ id: 'tag1' })}>
          <EditTag
            tags={tags}
            setTags={setTags}
            onChange={(e: any) => {
              setTags(e);
            }}
          ></EditTag>
        </ProFormFieldSet>
        <ProFormFieldSet label={intl.formatMessage({ id: 'tag2' })}>
          <EditTag
            tags={tags2}
            setTags={setTags2}
            onChange={(e: any) => {
              setTags2(e);
            }}
          ></EditTag>
        </ProFormFieldSet>
        <ProFormFieldSet label={intl.formatMessage({ id: 'tag3' })}>
          <EditTag
            tags={tags3}
            setTags={setTags3}
            onChange={(e: any) => {
              setTags3(e);
            }}
          ></EditTag>
        </ProFormFieldSet>
        {/* <ProFormFieldSet label={intl.formatMessage({ id: 'upload', })}>
        <Upload
        name='file'
        listType='picture-card'
        fileList={upload}
        showUploadList={{
          extra: ()=>{
            return <CopyOutlined style={{ color:"white"}}/>;
          },
          removeIcon: (file)=>{
            return <Popconfirm
            title="Delete the image"
            description="Are you sure to delete this image?"
            onConfirm={async()=>{
              file.status = 'removed';
            }}
            onCancel={()=>{}}
            okText="Yes"
            cancelText="No">
              <DeleteOutlined style={{ color:"white"}}/>
            </Popconfirm>;
          }
        }}
        onChange={({file, fileList, event} : any) => {
          fileList.forEach((value : any, index : number)=>{
            if(value?.status === 'done' && value?.response?.name){
              //console.log(value?.response?.name);
              value.url = resolveUrl(itemData?.base, itemData?.category, itemData?.subcategory, itemData?.name, value?.response?.name);
            }
          });
          setUpload(fileList);
        }}
        onRemove={async(file) => {
          //console.log(file);
          if(file?.status === 'removed'){
            messageApi.open({
              key: 'itemUpdate',
              type: 'loading',
              content: 'Delete in progress..',
              duration: 0,
            });

            try{
              const { success, message } = await apiRequest<any>(resolveUrl(itemData?.base, itemData?.category, itemData?.subcategory, itemData?.name, file.name), {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json'
                },
              });
              if(success) {
                file.status = 'removed';
                messageApi.open({
                  key: 'itemUpdate',
                  type: 'success',
                  content: 'Deleted!',
                  duration: 2,
                });
                setUpdating(false);
              } else {
                messageApi.open({
                  key: 'itemUpdate',
                  type: 'error',
                  content: message,
                  duration: 2,
                });
                setUpdating(false);
              }
            }catch(error){
              messageApi.open({
                key: 'itemUpdate',
                type: 'error',
                content: 'Failed',
                duration: 2,
              });
              setUpdating(false);
            }
            return true;
          }
          return false;
        }}
        customRequest={({
          action,
          data,
          file,
          filename,
          headers,
          onError,
          onProgress,
          onSuccess,
          withCredentials,
        }: any) => {
          // EXAMPLE: post form-data with 'axios'
          // eslint-disable-next-line no-undef
          const formData = new FormData();
          if (data) {
            Object.keys(data).forEach(key => {
              formData.append(key, data[key] as string);
            });
          }
          formData.append('file', file);
          
          apiRequest<any>(resolveUrl(itemData?.base, itemData?.category, itemData?.subcategory, itemData?.name, file.name), {
            method: 'POST',
            data: formData,
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: ({ total, loaded }) => {
              onProgress({ percent: Number(Math.round((loaded / total) * 100).toFixed(2)) }, file);
            },
          }).then((result) => {
            messageApi.open({
              key: 'itemUpdate',
              type: (result?.success? 'success': 'error'),
              content: result?.message,
              duration: 2,
            });
            if(result?.success){
              console.log('success');
              onSuccess({name: file.name}, file);
            }else{
              onError({name: file.name}, file);
            }
          })
          .catch(onError);;

          return {
            abort() {
              console.log('upload progress is aborted.');
            },
          };
        }}
        >
          <span><UploadOutlined /> 单击上传</span>
        </Upload>
      </ProFormFieldSet> */}
        <ProFormUploadButton
          name="upload"
          label={intl.formatMessage({ id: 'upload' })}
          initialValue={itemData?.upload}
          fieldProps={{
            name: 'file',
            listType: 'picture-card',
            showUploadList: {
              extra: () => {
                return <CopyOutlined style={{ color: 'white' }} />;
              },
              removeIcon: (file) => {
                return (
                  <Popconfirm
                    title="Delete the image"
                    description="Are you sure to delete this image?"
                    onConfirm={() => {
                      file.status = 'removed';
                    }}
                    onCancel={() => {}}
                    okText="Yes"
                    cancelText="No"
                  >
                    <DeleteOutlined style={{ color: 'white' }} />
                  </Popconfirm>
                );
              },
            },
            onPreview: (file) => {
              setPreviewThumbSrc(file?.thumbUrl);
              setPreviewSrc(file?.url);
              setPreviewVisible(true);
              // let options : any = {
              //   dataSource:[
              //     {
              //       html: '<div id="xplayerPreview" style="width: 100%; height: 100%"></div>'
              //     }
              //   ],
              //   pswpModule: () => import('photoswipe'),
              // };
              // options.showHideAnimationType = 'zoom';
              // options.bgOpacity = 1;
              // options.secondaryZoomLevel = 1;
              // options.maxZoomLevel = 2;
              // options.index = 0;
              // options.udfUrl = file?.url;

              // const lightbox = new PhotoSwipeLightbox(options);
              // lightbox.on('contentAppend', ({ content }) => {
              //   console.log('contentAppend', content);
              //   new Player({
              //     id: 'xplayerPreview',
              //     fluid: true,
              //     volume: 0.2,
              //     url: options?.udfUrl,
              //   })
              // });
              // lightbox.init();
              // lightbox.loadAndOpen(0);
            },
            onChange: ({ file, fileList, event }: any) => {
              fileList.forEach((value: any, index: number) => {
                if (value?.status === 'done' && value?.response?.name) {
                  //console.log(value?.response?.name);
                  value.url = resolveUrl(
                    itemData?.base,
                    itemData?.category,
                    itemData?.subcategory,
                    itemData?.name,
                    value?.response?.name,
                  );
                }
              });
            },
            onRemove: async (file) => {
              //console.log(file);
              if (file?.status === 'removed') {
                if (file?.url) {
                  showMessage({
                    key: 'itemUpdate',
                    type: 'loading',
                    content: 'Delete in progress..',
                    duration: 0,
                  });
                  const token = getToken();

                  try {
                    const { success, message } = await apiRequest<any>(
                      resolveUrl(
                        itemData?.base,
                        itemData?.category,
                        itemData?.subcategory,
                        itemData?.name,
                        file.name,
                      ),
                      {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                      },
                    );
                    if (success) {
                      file.status = 'removed';
                      console.log(file);
                      showMessage({
                        key: 'itemUpdate',
                        type: 'success',
                        content: 'Deleted!',
                        duration: 2,
                      });
                      setUpdating(false);
                      return true;
                    } else {
                      file.status = 'done';
                      showMessage({
                        key: 'itemUpdate',
                        type: 'error',
                        content: message,
                        duration: 2,
                      });
                      setUpdating(false);
                    }
                  } catch (error) {
                    file.status = 'done';
                    showMessage({
                      key: 'itemUpdate',
                      type: 'error',
                      content: 'Failed',
                      duration: 2,
                    });
                    setUpdating(false);
                  }
                } else {
                  return true;
                }
              }
              return false;
            },
            customRequest: ({
              action,
              data,
              file,
              filename,
              headers,
              onError,
              onProgress,
              onSuccess,
              withCredentials,
            }: any) => {
              // EXAMPLE: post form-data with 'axios'
              // eslint-disable-next-line no-undef
              const formData = new FormData();
              if (data) {
                Object.keys(data).forEach((key) => {
                  formData.append(key, data[key] as string);
                });
              }
              formData.append('file', file);
              const token = getToken();

              apiRequest<any>(
                resolveUrl(
                  itemData?.base,
                  itemData?.category,
                  itemData?.subcategory,
                  itemData?.name,
                  file.name,
                ),
                {
                  method: 'POST',
                  data: formData,
                  headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                  },
                  onUploadProgress: ({ total, loaded }) => {
                    onProgress(
                      {
                        percent: Number(
                          Math.round((loaded / total) * 100).toFixed(2),
                        ),
                      },
                      file,
                    );
                  },
                },
              )
                .then((result) => {
                  showMessage({
                    key: 'itemUpdate',
                    type: result?.success ? 'success' : 'error',
                    content:
                      result?.message ||
                      (result?.success ? 'Uploaded!' : 'Failed to upload'),
                    duration: 2,
                  });
                  if (result?.success) {
                    console.log('success');
                    onSuccess({ name: file.name }, file);
                  } else {
                    onError({ name: file.name }, file);
                  }
                })
                .catch(onError);

              return {
                abort() {
                  console.log('upload progress is aborted.');
                },
              };
            },
          }}
          action={CONFIG.apiUrl + '/api/resouce'}
          extra=""
        />
        <ProFormUploadButton
          className="uploadImage"
          name="uploadImage"
          label={intl.formatMessage({ id: 'uploadImage' })}
          initialValue={itemData?.uploadImage}
          fieldProps={{
            name: 'file',
            listType: 'picture-card',
            maxCount: 2,
            onPreview: (file) => {
              // setPreviewSrc(file?.url);
              // setPreviewVisible(true);
              let options: any = { ...imageSwapOption };
              options.index = file?.index;
              options.showHideAnimationType = 'zoom';
              options.bgOpacity = 1;
              options.secondaryZoomLevel = 1;
              options.maxZoomLevel = 2;
              const pswp = new PhotoSwipe(options);
              pswp.init();
            },
          }}
          disabled
        ></ProFormUploadButton>
        <ProFormSelect
          name="thumbnail"
          label={intl.formatMessage({ id: 'thumbnail' })}
          initialValue={itemData?.thumbnail}
          options={itemData?.fileList}
        />
        <ProFormSelect
          name="roll"
          label={intl.formatMessage({ id: 'roll' })}
          initialValue={itemData?.roll}
          options={itemData?.fileList}
        />
        <ProFormSelect
          name="trailer"
          label={intl.formatMessage({ id: 'trailer' })}
          initialValue={itemData?.trailer}
          options={itemData?.fileList}
        />
        <ProFormList
          name="images"
          label={intl.formatMessage({ id: 'images' })}
          initialValue={itemData?.imgList}
          copyIconProps={{ Icon: SmileOutlined, tooltipText: '复制此项到末尾' }}
          deleteIconProps={{
            Icon: CloseCircleOutlined,
            tooltipText: '不需要这行了',
          }}
        >
          {/* <ProFormText name="value" width="lg"/> */}
          <ProFormSelect
            name="value"
            width="lg"
            options={itemData?.fileList}
          ></ProFormSelect>
        </ProFormList>
      </Skeleton>
    </DrawerForm>
  );
};

export default EditItem;
