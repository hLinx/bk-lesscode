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
    import dayjs from 'dayjs'
    import { defineComponent } from '@vue/composition-api'
    import { execCopy } from '@/common/util'
    import { UPLOAD_STATUS, UploadFile, getFileUrl, formatSize } from './helper'
    import FileIcon from './file-icon.vue'

    export default defineComponent({
        components: {
            FileIcon
        },
        filters: {
            time: function (value) {
                if (!value) return '--'
                return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
            }
        },
        props: {
            files: {
                type: Array,
                default: () => []
            },
            isSearch: Boolean
        },
        setup (props, { emit }) {
            const handleCopyLink = (file: UploadFile) => {
                execCopy(getFileUrl(file, true))
            }

            const handleRemove = (file: UploadFile) => {
                emit('remove', file)
            }
            return {
                UPLOAD_STATUS,
                getFileUrl,
                formatSize,
                handleCopyLink,
                handleRemove
            }
        }
    })
</script>

<template>
    <div class="list-table">
        <bk-table
            class="file-table g-hairless-table"
            :outer-border="false"
            :header-border="false"
            :header-cell-style="{ background: '#f0f1f5' }"
            :data="files">
            <bk-table-column label="文件名称" prop="name" min-width="210" sortable show-overflow-tooltip>
                <template v-slot="{ row }">
                    <div :class="['filename-content', row.status]">
                        <file-icon :is-card="false" :file="row" />
                        <bk-link theme="primary" class="filename"
                            target="_blank"
                            :href="getFileUrl(row, true, true)"
                            :disabled="row.status === UPLOAD_STATUS.FAIL">
                            {{row.name}}
                        </bk-link>
                    </div>
                </template>
            </bk-table-column>
            <bk-table-column label="大小" prop="size" min-width="90" sortable show-overflow-tooltip>
                <template v-slot="{ row }">
                    <span>{{formatSize(row.size)}}</span>
                </template>
            </bk-table-column>
            <bk-table-column label="状态" prop="status" min-width="150" show-overflow-tooltip>
                <template v-slot="{ row }">
                    <div :class="['upload-status', row.status]">
                        <bk-progress v-if="row.status === UPLOAD_STATUS.UPLOADING" :percent="row.percentage / 100" size="small"></bk-progress>
                        <div class="status-content" v-if="row.status === UPLOAD_STATUS.SUCCESS">上传成功</div>
                        <div class="status-content" v-if="row.status === UPLOAD_STATUS.FAIL">
                            <span class="fail-title">上传失败</span>
                            <span class="fail-message" v-if="row.statusText">（{{row.statusText}}）</span>
                        </div>
                    </div>
                </template>
            </bk-table-column>
            <bk-table-column label="创建人" prop="createUser" min-width="90" sortable show-overflow-tooltip></bk-table-column>
            <bk-table-column label="创建时间" prop="createTime" min-width="200" sortable show-overflow-tooltip>
                <template v-slot="{ row }">
                    <span>{{row.createTime | time}}</span>
                </template>
            </bk-table-column>
            <bk-table-column label="操作" min-width="150">
                <template v-slot="{ row }">
                    <span v-bk-tooltips="{ content: '文件上传中，暂无链接', placements: ['top'], disabled: row.status !== UPLOAD_STATUS.UPLOADING }">
                        <bk-button
                            text
                            :disabled="row.status !== 'success'"
                            @click="handleCopyLink(row)">
                            复制链接
                        </bk-button>
                    </span>
                    <bk-popconfirm
                        trigger="click"
                        title="确认要删除该图片？"
                        content="删除后不可恢复，已引用的组件将显示异常"
                        @confirm="handleRemove(row)">
                        <bk-button text class="ml10">删除</bk-button>
                    </bk-popconfirm>
                </template>
            </bk-table-column>
            <template #empty>
                <bk-exception type="empty" scene="part">
                    <span v-if="isSearch">未找到文件</span>
                    <span v-else>暂无文件</span>
                </bk-exception>
            </template>
        </bk-table>
    </div>
</template>

<style lang="postcss" scoped>
    @import "@/css/mixins/scroller";

    .list-table {
        width: 100%;
        height: 100%;

        .upload-status {
            ::v-deep .bk-progress {
                width: 120px;
                .progress-text {
                    font-size: 12px !important;
                    width: auto;
                    white-space: nowrap;
                }
            }

            .status-content {
                display: inline-flex;
                width: 100%;
                position: relative;
                padding-left: 16px;
                &::before {
                    content: '';
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    opacity: 1;
                    background: #e5f6ea;
                    border: 1px solid #3fc06d;
                    border-radius: 50%;
                    box-sizing: border-box;
                    top: 50%;
                    left: 0;
                    transform: translateY(-50%);
                }
            }

            &.fail {
                .status-content {
                    &::before {
                        background: #ffe6e6;
                        border: 1px solid #ea3636;
                    }

                    .fail-title {
                        white-space: nowrap;
                    }

                    .fail-message {
                        text-overflow: ellipsis;
                        overflow: hidden;
                        white-space: nowrap;
                    }
                }
            }
        }

        .filename-content {
            display: flex;
            align-items: center;

            .bk-drag-icon {
                font-size: 18px;
                margin-right: 10px;
            }

            ::v-deep .bk-link {
                &.filename {
                    width: calc(100% - 28px);
                    justify-content: flex-start;
                    white-space: nowrap;
                }

                .bk-link-text {
                    font-size: 12px;
                    width: 100%;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }
            }

            &.fail {
                color: #ea3636;
                .bk-link {
                    color: #ea3636;
                }
            }
        }

        .file-table {
            height: 100%;
        }
        ::v-deep .bk-table-body-wrapper {
            height: calc(100% - 43px);
            overflow-y: auto;
            @mixin scroller;
        }
    }
    .bk-table-row {
        .bk-button-text + .bk-button-text {
            margin-left: 10px;
        }
    }
</style>
