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

<template>
    <section class="panel-template" v-bkloading="{ isLoading }">
        <div class="category-tabs">
            <div
                class="tab-item"
                :class="{ active: tab === 'project' }"
                @click="handleToggleTab('project')">
                <span class="tab-item-label">页面模板</span>
            </div>
            <div
                class="tab-item"
                :class="{ active: tab === 'market' }"
                @click="handleToggleTab('market')">
                <span class="tab-item-label">模板市场</span>
            </div>
        </div>
        <div class="template-list">
            <search-box :list="renderTemplateList"
                @on-change="handleSearchChange" />
            <group-box
                v-for="(group) in renderGroupTemplateList"
                :list="group.list"
                :group-name="group.categoryName"
                group="layout"
                :create-fallback="createFallback"
                :key="group.id">
                <div
                    v-for="(template, templateIndex) in group.list"
                    class="template-item"
                    :class="{
                        'uninstall': type === 'market' && !template.hasInstall
                    }"
                    :key="templateIndex">
                    <div class="item-img">
                        <img :src="template.previewImg" />
                        <div
                            v-if="type === 'market' && !template.hasInstall"
                            class="mask">
                            <bk-button
                                class="apply-btn"
                                theme="primary"
                                size="small"
                                @click.stop="handleApply(template)">
                                添加到应用
                            </bk-button>
                        </div>
                    </div>
                    <div class="item-info">
                        <span class="item-name">{{ template.templateName }}</span>
                        <span
                            class="preview"
                            @click="handlePreview(template)">
                            预览
                        </span>
                    </div>
                </div>
            </group-box>
        </div>
        <template-edit-dialog
            ref="templateApplyDialog"
            action-type="apply"
            :refresh-list="fetchData" />
    </section>
</template>
<script>
    import LC from '@/element-materials/core'
    import templateEditDialog from '@/views/project/template-manage/components/template-edit-dialog'
    import { PAGE_TEMPLATE_TYPE } from '@/common/constant'
    import { bus } from '@/common/bus'
    import GroupBox from '../common/group-box'
    import SearchBox from '../common/search-box'
    import { mapGetters } from 'vuex'

    export default {
        name: 'template-panel',
        components: {
            GroupBox,
            SearchBox,
            templateEditDialog
        },
        props: {
            dragingComponent: {
                type: Object,
                default: null
            }
        },
        data () {
            return {
                isLoading: false,
                tab: 'project',
                type: 'project',
                dragOptions: {
                    disabled: false
                },
                marketTemplateGroups: PAGE_TEMPLATE_TYPE,
                projectTemplateList: [],
                marketTemplateList: [],
                projectTemplateGroupList: [],
                marketTemplateGroupList: [],
                searchResult: null,
                templateGroupFolded: {},
                renderGroupTemplateList: []
            }
        },
        computed: {
            ...mapGetters('page', ['platform', 'pageDetail']),
            ...mapGetters('projectVersion', {
                versionId: 'currentVersionId'
            }),
            renderTemplateList () {
                return this.type === 'project' ? this.projectTemplateList : this.marketTemplateList
            }
        },
        created () {
            this.projectId = this.$route.params.projectId
            this.curDragingComponent = null
            this.fetchData(true)
            bus.$on('update-template-list', this.fetchData)
        },
        methods: {
            /**
             * @desc 获取模板数据
             */
            async fetchData (initData = true) {
                try {
                    this.isLoading = true
                    const [
                        projectTemplateGroups,
                        tmpProjectTemplateList,
                        tmpMarketTemplateList
                    ] = await Promise.all([
                        this.$store.dispatch('pageTemplate/categoryList', { projectId: this.projectId }),
                        this.$store.dispatch('pageTemplate/list', { projectId: this.projectId }),
                        this.$store.dispatch('pageTemplate/list', { type: 'OFFCIAL' })
                    ])
                    const projectTemplateList = tmpProjectTemplateList.map(item => ({
                        ...item,
                        type: item.templateName,
                        name: item.templateName,
                        displayName: ''
                    })).filter(item => item.templateType === this.platform || (this.platform === 'PC' && !item.templateType))

                    const marketTemplateList = tmpMarketTemplateList.map(item => ({
                        ...item,
                        type: item.templateName,
                        name: item.templateName,
                        displayName: '',
                        hasInstall: projectTemplateList.filter(template => (template.parentId === item.id) || template.id === item.id).length > 0
                    })).filter(item => item.templateType === this.platform || (this.platform === 'PC' && !item.templateType))

                    this.projectTemplateGroupList = projectTemplateGroups.map(item => ({
                        id: item.id,
                        categoryName: item.name,
                        list: projectTemplateList.filter(template => template.categoryId === item.id)
                    }))
                    this.marketTemplateGroupList = this.marketTemplateGroups.map(item => ({
                        id: item.id,
                        categoryName: item.name,
                        list: marketTemplateList.filter(template => template.offcialType === item.id)
                    }))
                    this.projectTemplateList = Object.freeze(projectTemplateList)
                    this.marketTemplateList = Object.freeze(marketTemplateList)
                    this.renderGroupTemplateList = this.type === 'project' ? Object.freeze(this.projectTemplateGroupList) : Object.freeze(this.marketTemplateGroupList)

                    if (initData !== true) {
                        console.log('refreshfuncandvar')
                        const [functionData] = await Promise.all([
                            this.$store.dispatch('functions/getAllGroupAndFunction', {
                                projectId: this.projectId,
                                versionId: this.versionId
                            }),
                            this.$store.dispatch('variable/getAllVariable', {
                                projectId: this.projectId,
                                pageCode: this.pageDetail.pageCode,
                                versionId: this.versionId,
                                effectiveRange: 0
                            })
                        ])
                        this.$store.commit('functions/setFunctionData', functionData)
                    }
                } catch (err) {
                    this.$bkMessage({
                        theme: 'error',
                        message: err.message || err
                    })
                } finally {
                    this.isLoading = false
                }
            },
            createFallback (list, index) {
                return LC.parseTemplate(JSON.parse(list[index].content))
            },
            /**
             * @desc tab 切换
             * @param { String } tab
             */
            handleToggleTab (tab) {
                this.tab = tab
                this.type = tab
                if (this.type === 'project') {
                    this.renderGroupTemplateList = Object.freeze(this.projectTemplateGroupList)
                    this.dragOptions = {
                        disabled: false
                    }
                } else {
                    this.renderGroupTemplateList = Object.freeze(this.marketTemplateGroupList)
                    this.dragOptions = {
                        disabled: true
                    }
                }
            },
            onChoose (e, list) {
                const contentStr = list[e.oldIndex] && list[e.oldIndex].content
                this.curDragingComponent = LC.parseTemplate(JSON.parse(contentStr))
            },
            cloneFunc () {
                return this.curDragingComponent
            },

            getComponentGroupClass (groupId, groupIndex) {
                return [
                    'component-group',
                    {
                        'first': groupIndex === 0,
                        'folded': this.templateGroupFolded[groupId],
                        'search-show': this.searchResult && (groupId === this.searchResult.categoryId || groupId === this.searchResult.offcialType)
                    }
                ]
            },
            /**
             * @desc 预览模板
             * @param { Number } template
             */
            handlePreview (template) {
                window.open(`/preview-template/project/${template.belongProjectId}/${template.id}`, '_blank')
            },

            handleApply (template) {
                this.$refs.templateApplyDialog.isShow = true
                this.$refs.templateApplyDialog.templateId = template.id
                this.$refs.templateApplyDialog.fromTemplate = template
                this.$refs.templateApplyDialog.dialog.formData = {
                    categoryId: '',
                    belongProjectId: this.projectId,
                    templateName: template.templateName
                }
            },
            /**
             * @desc 模板搜索
             */
            handleSearchChange (data) {
                if (!data) {
                    this.renderGroupTemplateList = this.type === 'project' ? Object.freeze(this.projectTemplateGroupList) : Object.freeze(this.marketTemplateGroupList)
                    return
                }
                const renderGroupTemplateList = []
                this.renderGroupTemplateList.forEach(template => {
                    if (template.list.includes(data)) {
                        renderGroupTemplateList.push({
                            id: template.id,
                            categoryName: template.categoryName,
                            list: [data]
                        })
                    }
                })
                this.renderGroupTemplateList = Object.freeze(renderGroupTemplateList)
            }
        }
    }
</script>
<style lang="postcss" scoped>
    @import "@/css/mixins/scroller";

    .panel-template{
        min-height: 100%;
        height: 100%;
        .category-tabs{
            display: flex;
            border-bottom: 1px solid #ccc;
            .tab-item {
                flex: 1;
                font-size: 14px;
                padding: 0 8px;
                margin-right: 4px;
                margin-bottom: -1px;
                height: 46px;
                line-height: 46px;
                white-space: nowrap;
                text-align: center;
                cursor: pointer;
                &.active{
                    color: #3a84ff;
                    border-bottom: 2px solid #3a84ff;
                }
            }
        }
        .search-box {
            padding: 12px 20px;
        }
        .template-list{
            height: calc(100% - 46px);
            padding-bottom: 10px;
            overflow-y: auto;
            @mixin scroller;
        }
        .template-item {
            margin-top: 10px;
            margin-left: 8px;
            cursor: pointer;
            width: 136px;
            height: 111px;
            background: #ffffff;
            border: 1px solid #dcdee5;
            border-radius: 3px;

            &:hover {
                border: 1px solid #3a84ff;
                .item-img {
                    .mask .apply-btn {
                        display: block;
                    }
                }
                .item-info {
                    .item-name {
                        width: 90px;
                    }
                    .preview {
                        display: block;
                    }
                }
            }
            .item-img {
                position: relative;
                width: 100%;
                height: 81px;
                img {
                    width: 100%;
                    object-fit: contain;
                    max-height: 100%;
                }
                .mask {
                    display: flex;
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.1);
                    align-items: center;
                    .apply-btn {
                        display: none;
                        margin-left: 23px;
                    }
                }
            }
            .item-info {
                display: flex;
                justify-content: space-between;
                padding: 4px 8px;
                font-size: 12px;
                .item-name {
                    color: #63656e;
                    width: 120px;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .preview {
                    display: none;
                    color: #3a84ff;
                    cursor: pointer;
                }
            }
        }
    }
    
</style>
