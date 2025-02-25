<template>
    <section>
        <lc-dialog v-model="isShow"
            render-directive="if"
            theme="primary"
            width="1080"
            :position="{ top: 100 }"
            :mask-close="false"
            :auto-close="false"
            header-position="left"
            ext-cls="create-template-dialog"
            :close-icon="false"
            @value-change="handleDialogToggle">
            <div slot="header">
                <span slot="header">
                    从模板新建应用
                    <i
                        class="bk-icon icon-info-circle"
                        style="font-size: 14px;"
                        v-bk-tooltips.top="{
                            content: '创建lesscode应用时，会同步在蓝鲸开发者中心创建应用的default模块'
                        }"></i>
                </span>
            </div>
            <div class="layout-left">
                <bk-input
                    clearable
                    :placeholder="'请输入模板名称'"
                    :right-icon="'bk-icon icon-search'"
                    :ext-cls="'search-input'"
                    v-model="searchFilter"
                    @enter="handleSearchEnter"
                    @clear="handleSearchClear">
                </bk-input>
                <ul class="filter-links">
                    <li
                        v-for="link in filterLinks"
                        :key="link.id"
                        :class="['link-item', { 'active': filter === link.id }]"
                        @click="handleClickFilter(link.id)">
                        {{link.name}}
                    </li>
                </ul>
                <div class="template-container" v-bkloading="{ isLoading: pageLoading, opacity: 1 }">
                    <div class="template-container-wrapper" v-show="!pageLoading">
                        <div class="template-list" v-show="!pageLoading">
                            <li v-for="template in list" :key="template.id"
                                :class="['list-item', { checked: template.checked }]"
                                @click="handleClickItem(template)">
                                <div class="checkbox">
                                    <i class="bk-icon icon-check-1 checked-icon"></i>
                                </div>
                                <div class="layout-img">
                                    <page-preview-thumb alt="模板缩略预览" :project-id="template.id" :img-src="template.templateImg" />
                                </div>
                                <div class="layout-name">
                                    <span class="template-name" :title="template.projectName">{{ template.projectName }}</span>
                                    <span class="template-preview" @click.stop.prevent="handlePreview(template.id)">预览</span>
                                </div>
                            </li>
                        </div>
                        <div class="empty" v-show="!list.length">
                            <bk-exception class="exception-wrap-item exception-part" type="empty" scene="part">
                                <div>暂无应用模板</div>
                            </bk-exception>
                        </div>
                    </div>
                </div>
            </div>
            <div class="layout-right">
                <lc-form ref="templateForm" :label-width="150" :rules="formRules" :model="formData" :form-type="'vertical'">
                    <lc-form-item label="当前已选模板" property="templateName" error-display-type="normal">
                        <bk-input readonly v-model.trim="formData.templateName"
                            placeholder="模板名称">
                        </bk-input>
                    </lc-form-item>
                    <lc-form-item label="应用名称" required property="projectName" error-display-type="normal">
                        <bk-input maxlength="60" v-model.trim="formData.projectName"
                            placeholder="由汉字，英文字母，数字组成，20个字符以内">
                        </bk-input>
                    </lc-form-item>
                    <lc-form-item label="应用ID" required property="projectCode" error-display-type="normal">
                        <bk-input maxlength="60" v-model.trim="formData.projectCode"
                            placeholder="由小写字母组成，长度小于16个字符，该ID将作为自定义组件前缀，创建后不可更改">
                        </bk-input>
                    </lc-form-item>
                    <lc-form-item label="应用简介" required property="projectDesc" error-display-type="normal">
                        <bk-input
                            v-model.trim="formData.projectDesc"
                            :type="'textarea'"
                            :rows="3"
                            :maxlength="100">
                        </bk-input>
                    </lc-form-item>
                </lc-form>
            </div>
            <div class="dialog-footer" slot="footer">
                <bk-button
                    theme="primary"
                    :loading="loading"
                    @click="handleCreateConfirm">确定</bk-button>
                <bk-button @click="handleDialogCancel" :disabled="loading">取消</bk-button>
            </div>
        </lc-dialog>
    </section>
</template>

<script>
    import PagePreviewThumb from '@/components/project/page-preview-thumb.vue'
    import { PROJECT_TEMPLATE_TYPE } from '@/common/constant'
    import { leaveConfirm } from '@/common/leave-confirm'

    const defaultFormData = {
        templateName: '',
        projectName: '',
        projectCode: '',
        projectDesc: '',
        copyFrom: null
    }
    const projectTemplateType = [{ id: '', name: '全部' }].concat(PROJECT_TEMPLATE_TYPE)

    export default {
        name: 'template-dialog',
        components: {
            PagePreviewThumb
        },
        data () {
            return {
                isShow: false,
                loading: false,
                formData: { ...defaultFormData },
                formRules: {
                    templateName: [
                        {
                            required: true,
                            message: '必选项',
                            trigger: 'click'
                        }
                    ],
                    projectName: [
                        {
                            regex: /^[a-zA-Z0-9\u4e00-\u9fa5]{1,200}$/,
                            message: '由汉字，英文字母，数字组成，20个字符以内',
                            trigger: 'blur'
                        }
                    ],
                    projectCode: [
                        {
                            regex: /^[a-z]{1,16}$/,
                            message: '只能由小写字母组成, 16个字符以内',
                            trigger: 'blur'
                        }
                    ],
                    projectDesc: [
                        {
                            required: true,
                            message: '必填项',
                            trigger: 'blur'
                        }
                    ]
                },
                filterLinks: [...projectTemplateType],
                filter: '',
                searchFilter: '',
                templateList: [],
                list: [],
                pageLoading: false
            }
        },
        watch: {
            searchFilter (val) {
                if (!val) {
                    this.handleSearchClear()
                }
            }
        },
        methods: {
            async getTemplateList () {
                this.pageLoading = true
                try {
                    const params = { filter: 'official', officialType: this.filter }
                    const { projectList } = await this.$store.dispatch('project/query', { config: { params } })
                    this.templateList = projectList.map(function (item) {
                        item['checked'] = false
                        return item
                    })
                    this.handleSearchEnter()
                } catch (e) {
                    console.error(e)
                } finally {
                    this.pageLoading = false
                }
            },
            async handleCreateConfirm () {
                try {
                    await this.$refs.templateForm.validate()
                    const data = this.formData

                    this.loading = true
                    const projectId = await this.$store.dispatch('project/create', { data })

                    this.messageSuccess('应用创建成功')
                    this.isShow = false
                    window.leaveConfirm = false

                    setTimeout(() => {
                        this.$emit('to-page', projectId)
                    }, 300)
                } catch (e) {
                    console.error(e)
                } finally {
                    this.loading = false
                }
            },
            handleClickFilter (link) {
                this.filter = link
                this.getTemplateList()
            },
            handleClickItem (template) {
                template.checked = !template.checked
                this.list.map(function (item) {
                    if (item.id !== template.id && item.checked) {
                        item.checked = false
                    }
                    return item
                })
                if (!template.checked) {
                    this.formData.templateName = ''
                    this.formData.copyFrom = null
                } else {
                    this.formData.templateName = template.projectName
                    this.formData.copyFrom = template.id
                }
            },
            handlePreview (id) {
                this.$emit('preview', id)
            },
            handleSearchClear () {
                this.list.splice(0, this.list.length, ...this.templateList)
            },
            handleSearchEnter () {
                const checked = this.templateList.find(item => item.checked)
                if (checked) checked.checked = false
                this.list.splice(0, this.list.length, ...this.templateList.filter(item => {
                    return item.projectName.toUpperCase().includes(this.searchFilter.toUpperCase())
                }))
                this.handleReSelect()
            },
            handleReSelect () {
                if (this.formData.copyFrom) {
                    const template = this.list.find(item => item.id === this.formData.copyFrom)
                    if (template) {
                        template.checked = true
                    } else {
                        this.formData.templateName = ''
                        this.formData.copyFrom = null
                    }
                }
            },
            handleDialogCancel () {
                leaveConfirm()
                    .then(() => {
                        this.isShow = false
                    })
            },
            handleDialogToggle () {
                if (this.isShow) {
                    this.filter = ''
                    this.searchFilter = ''
                    this.formData = { ...defaultFormData }
                    this.getTemplateList()
                }
            }
        }
    }
</script>

<style lang="postcss">
    @import "@/css/mixins/scroller";
    @import "@/css/mixins/ellipsis";

    .create-template-dialog{
        .bk-dialog-tool{
            display: none;
        }
        .bk-dialog-header{
            position: absolute;
            top: 30px;
        }
        .bk-dialog-body{
            padding: 0;
            height: 570px;
            display:flex;
            font-size:12px;

            .layout-left {
                width: 681px;
                height: 100%;
                opacity: 1;
                background: #ffffff;
                padding: 20px 0;

                .search-input {
                    width: 300px;
                    margin-left: calc(100% - 321px);
                }

                .template-container{
                    width: 100%;
                    height: calc(100% - 72px);
                    margin: 14px 0 0 18px;

                    .template-container-wrapper{
                        width: calc(100% - 20px);
                        height: 100%;
                        overflow-y: auto;
                        @mixin scroller;

                        .empty{
                            margin-top: 100px;
                        }
                    }
                }

                .template-list{
                    width: 100%;
                    display: flex;
                    flex-wrap: wrap;

                    .list-item {
                        position: relative;
                        flex: none;
                        display: flex;
                        flex-direction: column;
                        width: 206px;
                        height: 160px;
                        background: #ffffff;
                        border-radius: 2px;
                        cursor: pointer;
                        border: 1px solid #dcdee5;
                        margin-right: 10px;
                        margin-bottom: 10px;

                        &:nth-of-type(3n) {
                            margin-right: 0;
                        }

                        &:hover {
                            border-color: #3a84ff;
                            .layout-name .template-preview{
                                display: block;
                            }
                        }

                        &.checked {
                            border-color: #3a84ff;
                            background: #e1ecff;
                            .checkbox {
                                display: block;
                            }
                            .layout-name .template-preview{
                                display: none;
                            }
                        }

                        .checkbox {
                            display: none;
                            position: absolute;
                            right: -1px;
                            bottom: -1px;
                            border-style: solid;
                            border-width: 0 0 30px 34px;
                            border-color: transparent transparent #3A84FF transparent;
                            .checked-icon {
                                position: absolute;
                                left: -20px;
                                top: 10px;
                                color: #fff;
                                font-size: 20px;
                            }
                        }

                        .layout-img {
                            width: 100%;
                            height: 128px;

                            &::before {
                                content: "";
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 128px;
                                /* background: rgba(0, 0, 0, 0.4); */
                            }

                            img {
                                width: 100%;
                                height: 100%;
                            }

                            .empty-preview-img {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 14px;
                                font-weight: 700;
                                color: #C4C6CC;
                                height: 100%;
                                background: #f0f1f5;
                                border-radius: 4px 4px 0px 0px;
                            }
                        }
                        .layout-name {
                            padding: 0 6px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            height: 32px;
                            width: 100%;

                            .template-name{
                                color: #63656e;
                                @mixin ellipsis 80%, block;
                            }

                            .template-preview {
                                display: none;
                                color: #3A84FF;
                            }
                        }
                    }
                }
            }

            .layout-right {
                width: 399px;
                height: 100%;
                opacity: 1;
                background: #ffffff;
                border: 1px solid #dcdee5;
                padding: 20px;
            }
        }

        .filter-links {
            display: flex;
            align-items: center;
            margin: 10px 0 0 10px;

            .link-item {
                padding: 6px 12px;
                margin: 0 8px;
                border-radius: 16px;
                cursor: pointer;

                &:hover {
                    background: #E1ECFF;
                }

                &.active {
                    background: #E1ECFF;
                    color: #3A84FF;
                }
            }
        }
    }
</style>
