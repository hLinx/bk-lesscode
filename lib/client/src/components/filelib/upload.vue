<!--
  Tencent is pleased to support the open source community by making 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) available.
  Copyright (C) 2017-2019 THL A29 Limited, a Tencent company. All rights reserved.
  Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  http://opensource.org/licenses/MIT
  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
-->

<script lang="ts">
    import { defineComponent, ref, shallowRef } from '@vue/composition-api'
    import { genFileId } from './use-upload-handler.js'
    import useAjaxUpload from '@/common/use-ajax-upload.js'
    import { messageError } from '@/common/bkmagic'
    import type {
        UploadRawFile,
        UploadFile
    } from './helper'

    export default defineComponent({
        props: {
            params: {
                type: Object,
                default: () => ({})
            },
            accept: {
                type: String,
                default: 'image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.pdf,.zip,.tar,.gz'
            },
            showTips: {
                type: Boolean,
                default: true
            },
            maxlength: {
                type: Number,
                default: 10
            },
            maxImageSize: {
                type: Number,
                default: 5
            },
            maxFileSize: {
                type: Number,
                default: 10
            },
            multiple: {
                type: Boolean,
                default: true
            },
            autoUpload: {
                type: Boolean,
                default: true
            },
            onStart: Function,
            onProgress: Function,
            onSuccess: Function,
            onError: Function,
            onRemove: Function
        },
        setup (props, { emit }) {
            const inputFileEl = ref(null)

            const requests = shallowRef({})

            const handleClickUpload = () => {
                inputFileEl.value.value = null
                inputFileEl.value.click()
            }

            const handleChangeFiles = (event: Event) => {
                const { files } = event.target as HTMLInputElement
                if (!files) {
                    return
                }

                let uploadFiles = Array.from(files)
                if (!uploadFiles.length) {
                    return
                }

                if (uploadFiles.length > props.maxlength) {
                    uploadFiles = uploadFiles.slice(0, props.maxlength)
                }

                if (!props.multiple) {
                    uploadFiles = uploadFiles.slice(0, 1)
                }

                for (let i = 0, l = uploadFiles.length; i < l; i++) {
                    const file = uploadFiles[i]
                    const rawFile = file as UploadRawFile
                    rawFile.uid = genFileId()

                    const error = props.onStart(rawFile)

                    if (error) {
                        emit('file-error', error, rawFile, uploadFiles)
                        continue
                    }

                    if (props.autoUpload) {
                        sendFile(rawFile, uploadFiles)
                    }
                }
            }

            const sendFile = (rawFile: UploadRawFile, uploadFiles: File[]) => {
                const { uid } = rawFile
                const uploadOption = {
                    file: rawFile,
                    filename: 'file',
                    action: `${process.env.BK_AJAX_URL_PREFIX}/file/upload`,
                    method: 'POST',
                    data: [props.params],
                    withCredentials: true,
                    onProgress: (event: ProgressEvent) => {
                        props.onProgress(event, rawFile)
                    },
                    onSuccess: (res: unknown) => {
                        props.onSuccess(res, rawFile)
                        delete requests.value[uid]

                        emit('success', res, rawFile)
                    },
                    onError: (err: Error, res: unknown) => {
                        props.onError(err, rawFile, res)
                        delete requests.value[uid]
                    },
                    onComplete: () => {
                        if (uploadFiles.indexOf(rawFile) === uploadFiles.length - 1) {
                            emit('done')
                        }
                    }
                }
                const request = useAjaxUpload(uploadOption)
                requests.value[uid] = request
            }

            const abort = (file?: UploadFile) => {
                let reqs = requests.value
                if (file) {
                    reqs = { [file.uid]: requests.value[file.uid] }
                }
                Object.keys(reqs).forEach((uid) => {
                    if (reqs[uid] instanceof XMLHttpRequest) {
                        reqs[uid]?.abort()
                    }
                    delete requests.value[uid]
                })
            }

            return {
                abort,
                inputFileEl,
                handleClickUpload,
                handleChangeFiles
            }
        }
    })
</script>

<template>
    <div class="upload">
        <div class="upload-trigger" @click="handleClickUpload">
            <bk-button theme="primary">点击上传</bk-button>
            <input ref="inputFileEl" type="file" multiple :accept="accept" @change="handleChangeFiles">
        </div>
        <slot name="tip" v-bind="{ maxImageSize, maxFileSize }">
            <div class="tip" v-if="showTips">
                支持上传图片大小 {{maxImageSize}}M 以内，文件大小 {{maxFileSize}}M 以内的素材，格式支持 jpg，png，gif，svg，zip，doc，pdf，excel 等
            </div>
        </slot>
    </div>
</template>

<style lang="postcss" scoped>
.upload {
    display: flex;
    align-items: center;

    .tip {
        font-size: 12px;
        color: #979ba5;
        margin-left: 8px;
    }
}
.upload-trigger {
    input[type="file"] {
        display: none;
    }
}
</style>
