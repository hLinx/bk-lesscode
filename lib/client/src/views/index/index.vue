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
    <main
        class="lessocde-editor-page"
        v-bkloading="{
            isLoading: isContentLoading || isCustomComponentLoading
        }">
        <div class="lesscode-editor-page-header">
            <page-list />
            <div
                id="toolActionBox"
                class="function-and-tool">
                <operation-select v-model="operationType" />
                <!-- <div class="spilt-line" /> -->
                <!-- 保存、预览、快捷键等tool单独抽离 -->
                <action-tool />
            </div>
            <extra-links
                show-help-box
                :help-click="handleStartGuide"
                :help-tooltips="{
                    content: '画布操作指引',
                    placements: ['bottom']
                }" />
        </div>
        <template v-if="!isContentLoading && !isCustomComponentLoading">
            <draw-layout
                class="lesscode-editor-page-content">
                <material-panel slot="left" />
                <operation-area :operation="operationType" />
                <modifier-panel slot="right" />
            </draw-layout>
            <novice-guide ref="guide" :data="guideStep" />
        </template>
        <save-template-dialog />
    </main>
</template>
<script>
    import Vue from 'vue'
    import { mapActions, mapGetters, mapState } from 'vuex'
    import { debounce } from 'shared/util.js'
    import LC from '@/element-materials/core'
    import NoviceGuide from '@/components/novice-guide'
    import ExtraLinks from '@/components/ui/extra-links'
    import SaveTemplateDialog from '@/components/template/save-template-dialog'
    import DrawLayout from './components/draw-layout'
    import PageList from './components/page-list'
    import OperationSelect from './components/operation-select'
    import MaterialPanel from './components/material-panel'
    import ModifierPanel from './components/modifier-panel'
    import OperationArea from './components/operation-area'
    import ActionTool from './components/action-tool'
    import { syncVariableValue } from './components/utils'

    console.dir(LC)
    window.LC = LC

    export default {
        components: {
            NoviceGuide,
            ExtraLinks,
            SaveTemplateDialog,
            DrawLayout,
            PageList,
            OperationSelect,
            MaterialPanel,
            ModifierPanel,
            OperationArea,
            ActionTool
        },
        data () {
            return {
                isContentLoading: true,
                isCustomComponentLoading: true,
                operationType: 'edit'
            }
        },
        computed: {
            ...mapGetters(['user']),
            ...mapGetters('drag', ['curTemplateData']),
            ...mapGetters('page', ['pageDetail', 'platform']),
            ...mapGetters('functions', ['funcGroups']),
            ...mapGetters('layout', ['pageLayout']),
            ...mapGetters('variable', ['variableList']),
            ...mapGetters('projectVersion', {
                versionId: 'currentVersionId',
                versionName: 'currentVersionName',
                getInitialVersion: 'initialVersion'
            }),
            ...mapState('route', ['layoutPageList']),
            pageRoute () {
                return this.layoutPageList.find(({ pageId }) => pageId === Number(this.pageId))
            }
        },
        watch: {
            curTemplateData: {
                handler () {
                    this.handleUpdateNavPerview()
                }
            },
            layoutPageList: {
                handler () {
                    this.handleUpdateNavPerview()
                }
            },
            variableList () {
                // 变量发生变化的时候  reload
                this.handleUpdatePreviewContent()
            },
            funcGroups () {
                // 函数发生变化的时候  reload
                this.handleUpdatePreviewContent()
            },
            'pageDetail.lifeCycle' () {
                // 生命周期发生变化的时候  reload
                this.handleUpdatePreviewContent()
            },
            'pageDetail.styleSetting' () {
                // 页面样式发生变化的时候  reload
                this.handleUpdatePreviewContent()
            }
        },
        async created () {
            this.projectId = parseInt(this.$route.params.projectId)
            this.pageId = parseInt(this.$route.params.pageId)

            this.$nextTick(() => {
                LC.addEventListener('update', this.handleUpdatePreviewContent)
                // 更新预览区域数据
                LC.addEventListener('ready', this.initPerviewData)
                // 卸载的时候，清除 storage 数据
                LC.addEventListener('unload', this.clearPerviewData)
            })

            // 获取并设置当前版本信息
            this.$store.commit('projectVersion/setCurrentVersion', this.getInitialVersion())

            this.fetchData()

            this.debounceUpdatePreview = debounce(this.updatePreview)

            this.guideStep = [
                {
                    title: '组件库和图标',
                    content: '从基础组件、自定义业务组件、图标库中拖拽组件或图标到画布区域进行页面编排组装',
                    target: '#editPageLeftSideBar'
                },
                {
                    title: '组件树',
                    content: '以全局组件树的形式，快速切换查看页面的所有组件',
                    target: '#editPageLeftSideBar',
                    entry: () => {
                        // 切换组件树 tab
                        document.body.querySelector('[role="component-tree-panel-tab"]').click()
                    },
                    leave: () => {
                        // 离开时切换到组件选择 tab
                        document.body.querySelector('[role="component-panel-tab"]').click()
                    }
                },
                {
                    title: '画布编辑区',
                    content: '可在画布自由拖动组件、图标等进行页面布局，选中组件或布局后可右键对选中项进行复制粘贴等快捷操作',
                    target: '#lesscodeDrawContent'
                },
                {
                    title: '组件配置',
                    content: '在画布中选中对应组件，可在这里进行组件样式、属性、事件及指令的配置',
                    target: '#modifierPanel',
                    entry: () => {
                        const $componentEl = document.body.querySelector('[role="component-root"]')
                        if ($componentEl) {
                            $componentEl.click()
                        }
                    }
                },
                {
                    title: '页面操作',
                    content: '可以查看并下载完整源码，对页面生命周期、路由、函数等进行配置，以及对内容进行保存、预览、清空等操作',
                    target: '#toolActionBox'
                },
                {
                    title: '切换页面',
                    content: '点击页面名称可以快速切换页面，新建页面，以及复制已有的页面',
                    target: '#editPageSwitchPage'
                }
            ]
        },
        beforeDestroy () {
            // 路由离开的时候注销相关事件
            LC.removeEventListener('update', this.handleUpdatePreviewContent)
            // 更新预览区域数据
            LC.removeEventListener('ready', this.initPerviewData)
            // 卸载的时候，清除 storage 数据
            LC.removeEventListener('unload', this.clearPerviewData)
            window.removeEventListener('beforeunload', this.beforeunloadConfirm)
        },
        beforeRouteLeave (to, from, next) {
            this.$bkInfo({
                title: '确认离开?',
                subTitle: '您将离开画布编辑页面，请确认相应修改已保存',
                confirmFn: async () => {
                    next()
                }
            })
        },
        methods: {
            ...mapActions(['updatePreview']),
            /**
             * @desc 注册自定义组件
             */
            registerCustomComponent () {
                this.isCustomComponentLoading = true
                // 包含所有的自定组件
                window.__innerCustomRegisterComponent__ = {}
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script')
                    script.src = `/${this.projectId}/${this.pageId}/component/register.js`
                    script.onload = () => {
                        window.customCompontensPlugin.forEach((callback) => {
                            const [
                                config,
                                componentSource
                            ] = callback(Vue)
                            window.__innerCustomRegisterComponent__[config.type] = componentSource
                            // 注册自定义组件 material
                            LC.registerMaterial(config.type, config)
                        })
                        this.isCustomComponentLoading = false
                        resolve()
                    }
                    script.onerror = () => {
                        this.isCustomComponentLoading = false
                        reject(new Error('自定义组件注册失败'))
                    }
                    document.body.appendChild(script)
                    this.$once('hook:beforeDestroy', () => {
                        document.body.removeChild(script)
                        window.__innerCustomRegisterComponent__ = {}
                    })
                })
            },
            /**
             * @desc 获取页面编辑基础数据
             */
            async fetchData () {
                try {
                    this.isContentLoading = true
                    const [pageDetail, pageList, projectDetail, functionData, apiData] = await Promise.all([
                        this.$store.dispatch('page/detail', { pageId: this.pageId }),
                        this.$store.dispatch('page/getList', {
                            projectId: this.projectId,
                            versionId: this.versionId
                        }),
                        this.$store.dispatch('project/detail', { projectId: this.projectId }),
                        this.$store.dispatch('functions/getAllGroupAndFunction', {
                            projectId: this.projectId,
                            versionId: this.versionId
                        }),
                        this.$store.dispatch('api/getCategoryAndApiList', {
                            projectId: this.projectId,
                            versionId: this.versionId
                        }),
                        this.$store.dispatch('page/pageLockStatus', { pageId: this.pageId }),
                        this.$store.dispatch('route/getProjectPageRoute', {
                            projectId: this.projectId,
                            versionId: this.versionId
                        }),
                        this.$store.dispatch('layout/getPageLayout', { pageId: this.pageId }),
                        this.$store.dispatch('components/componentNameMap'),
                        this.$store.dispatch('dataSource/list', { projectId: this.projectId }),
                        // 进入画布拉取一次权限操作，给 iam getters projectPermActionList 赋值，保存页面时，需要用到 projectPermActionList
                        this.$store.dispatch('iam/getIamAppPermAction', { projectId: this.projectId }),
                        this.registerCustomComponent()
                    ])

                    await this.$store.dispatch('page/getPageSetting', {
                        pageId: this.pageId,
                        projectId: this.projectId,
                        versionId: this.versionId
                    })

                    const variableList = await this.$store.dispatch('variable/getAllVariable', {
                        projectId: this.projectId,
                        pageCode: pageDetail.pageCode,
                        versionId: this.versionId,
                        effectiveRange: 0
                    })

                    this.$store.commit('page/setPageDetail', pageDetail || {})
                    this.$store.commit('page/setPageList', pageList || [])
                    this.$store.commit('project/setCurrentProject', projectDetail || {})
                    this.$store.commit('functions/setFunctionData', functionData)
                    this.$store.commit('api/setApiData', apiData)

                    syncVariableValue(pageDetail.content, variableList)

                    // 设置初始targetData
                    LC.parseData(pageDetail.content)
                    LC.pageStyle = pageDetail.styleSetting

                    LC.platform = this.platform
                } catch (e) {
                    console.error(e)
                } finally {
                    this.isContentLoading = false
                }
            },
            /**
             * @desc 显示新手指引
             */
            handleStartGuide () {
                this.$refs.guide.start()
            },
            /**
             * @desc 页面离开确认
             * @param { Object } event
             */
            beforeunloadConfirm (event) {
                const confirmationMessage = '...';
                (event || window.event).returnValue = confirmationMessage
                return confirmationMessage
            },
            initPerviewData () {
                // 更新导航
                this.handleUpdateNavPerview()
                // 更新内容区域
                this.handleUpdatePreviewContent()
            },
            clearPerviewData () {
                localStorage.removeItem('ONLINE_PREVIEW_CONTENT')
                localStorage.removeItem('ONLINE_PREVIEW_NAV')
            },
            handleUpdatePreviewContent (setting = {}) {
                const defaultSetting = {
                    isGenerateNav: false,
                    id: this.projectId + this.pageDetail.pageCode + this.versionId,
                    curTemplateData: {},
                    storageKey: 'ONLINE_PREVIEW_CONTENT',
                    types: ['reload', 'update_style']
                }
                this.debounceUpdatePreview(Object.assign(defaultSetting, setting))
            },
            handleUpdateNavPerview (setting = {}) {
                const defaultSetting = {
                    isGenerateNav: true,
                    id: this.projectId + this.pageRoute.layoutPath + this.versionId,
                    curTemplateData: this.curTemplateData,
                    storageKey: 'ONLINE_PREVIEW_NAV',
                    types: ['reload']
                }
                this.updatePreview(Object.assign(defaultSetting, setting))
            }
        }
    }
</script>
<style lang="postcss">
    $headerHeight: 52px;
    $pageHeaderHeight: 52px;

    .lessocde-editor-page {
        min-width: 1366px;
        height: calc(100vh - $headerHeight);
        margin-top: $headerHeight;
    }
    .lesscode-editor-page-header {
        position: relative;
        display: flex;
        justify-content: space-between;
        height: 52px;
        background: #fff;

        &:after{
            content: '';
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;
            z-index: 99;
            height: 1px;
            box-shadow: 0px 2px 2px 0px rgba(0, 0, 0, 0.1);
        }

        .function-and-tool {
            position: relative;
            display: flex;
            flex: 1;
            justify-content: center;
            align-items: center;
        }
        .spilt-line {
            height: 22px;
            width: 1px;
            margin: 0 5px;
            background-color: #dcdee5;
        }
    }
    .lesscode-editor-page-content{
        height: calc(100vh - $headerHeight - $pageHeaderHeight);
    }
</style>
