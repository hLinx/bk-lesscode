<template>
    <div>
        <bk-sideslider
            class="create-sideslider"
            :is-show.sync="isVisible"
            :quick-close="false"
            :title="isEdit ? '编辑操作' : '新建操作'"
            :width="696"
            @hidden="hide">
            <div class="wrapper" slot="content" v-bkloading="{ isLoading: isLoading }">
                <bk-form :label-width="120" :model="formData" :rules="rules" ref="validateForm">
                    <bk-form-item label="操作 ID" required property="actionId">
                        <bk-input v-model="formData.actionId" :disabled="isEdit || isDefaultAction" :placeholder="`请输入操作 ID：如 ${IAM_APP_PERM_BUILDIN_ACTION}`"></bk-input>
                    </bk-form-item>
                    <bk-form-item label="操作名称" required property="actionName">
                        <bk-input v-model="formData.actionName" placeholder="请输入操作名称：如页面访问" :show-word-limit="true" maxlength="32"></bk-input>
                    </bk-form-item>
                    <bk-form-item label="操作名称英文" required property="actionNameEn">
                        <bk-input v-model="formData.actionNameEn" placeholder="请输入操作名称英文：如 View Page"></bk-input>
                    </bk-form-item>
                    <bk-form-item label="操作类型" property="actionType">
                        <bk-select v-model="formData.actionType">
                            <bk-option v-for="item in actionTypeList" :key="item.id"
                                :id="item.id" :name="item.name">
                            </bk-option>
                        </bk-select>
                    </bk-form-item>
                    <template v-if="isDefaultAction">
                        <bk-form-item label="是否关联资源" property="hasRelated">
                            <bk-radio-group v-model="formData.hasRelated">
                                <bk-radio :value="true" class="mr15" :disabled="!isEdit">是</bk-radio>
                                <bk-radio :value="false" :disabled="!isEdit">否</bk-radio>
                            </bk-radio-group>
                        </bk-form-item>
                        <bk-form-item label="关联资源" property="actionRelatedResourceId" v-if="formData.hasRelated">
                            <bk-select v-model="formData.actionRelatedResourceId" placeholder="请选择资源" multiple>
                                <bk-option v-for="item in relatedResourceList" :key="item.id"
                                    :id="item.id" :name="item.name">
                                </bk-option>
                            </bk-select>
                        </bk-form-item>
                    </template>
                    <bk-form-item label="操作描述" property="actionDesc">
                        <bk-input v-model="formData.actionDesc" :type="'textarea'" :rows="3" maxlength="255" placeholder="请输入操作描述"></bk-input>
                    </bk-form-item>
                    <bk-form-item label="操作描述英文" property="actionDescEn">
                        <bk-input v-model="formData.actionDescEn" :type="'textarea'" :rows="3" maxlength="255" placeholder="操作描述英文"></bk-input>
                    </bk-form-item>
                    <bk-form-item>
                        <bk-button ext-cls="mr5" theme="primary" title="提交" @click.stop.prevent="validate" :loading="isChecking">提交</bk-button>
                        <bk-button ext-cls="mr5" theme="default" title="取消" @click="hide">取消</bk-button>
                    </bk-form-item>
                </bk-form>
            </div>
        </bk-sideslider>
    </div>
</template>

<script>
    import { mapGetters } from 'vuex'

    import { IAM_ACTION_TYPE, IAM_APP_PERM_BUILDIN_ACTION } from 'shared/constant'

    export default {
        props: {
            isShow: {
                type: Boolean,
                default: true
            },
            isDefaultAction: {
                type: Boolean,
                default: true
            },
            curUpdate: {
                type: Object,
                default: () => ({})
            },
            iamAppPerm: {
                type: Object,
                default: () => ({})
            }
        },

        data () {
            return {
                isLoading: false,
                isVisible: false,
                isChecking: false,
                formData: {},
                relatedResourceList: [],
                actionTypeList: [],
                rules: {
                    actionId: [
                        {
                            required: true,
                            message: '请填写操作 ID',
                            trigger: 'blur'
                        },
                        {
                            message: '操作 ID 在应用内唯一',
                            trigger: 'blur',
                            validator: this.checkActionId
                        }
                    ],
                    actionName: [
                        {
                            required: true,
                            message: '请填写操作名称',
                            trigger: 'blur'
                        }
                    ],
                    actionNameEn: [
                        {
                            required: true,
                            message: '请填写操作名称英文',
                            trigger: 'blur'
                        }
                    ]
                },
                IAM_APP_PERM_BUILDIN_ACTION: IAM_APP_PERM_BUILDIN_ACTION
            }
        },

        computed: {
            ...mapGetters('projectVersion', { versionId: 'currentVersionId' }),
            projectId () {
                return this.$route.params.projectId
            },
            isEdit () {
                return Object.keys(this.curUpdate).length > 0
            }
        },

        watch: {
            isShow: {
                async handler (newVal) {
                    this.isVisible = newVal
                    if (this.isVisible) {
                        const actionTypeList = []
                        Object.keys(IAM_ACTION_TYPE).forEach(key => {
                            actionTypeList.push({
                                id: key,
                                name: IAM_ACTION_TYPE[key][1]
                            })
                        })
                        this.actionTypeList.splice(0, this.actionTypeList.length, ...actionTypeList)

                        this.resetFormData()
                        this.formData = Object.assign({}, {
                            actionId: this.curUpdate.actionId,
                            actionName: this.curUpdate.actionName,
                            actionNameEn: this.curUpdate.actionNameEn,
                            actionDesc: this.curUpdate.actionDesc,
                            actionDescEn: this.curUpdate.actionDescEn,
                            actionRelatedResourceId: this.curUpdate.actionRelatedResourceId,
                            actionType: this.curUpdate.actionType,
                            hasRelated: !!this.isDefaultAction && this.curUpdate.actionRelatedResourceId.length > 0
                        })
                        this.isLoading = true
                        if (this.isDefaultAction) {
                            await this.getRelatedResourceList()
                        }
                        this.isLoading = false
                    }
                },
                immediate: true
            }
        },

        methods: {
            resetFormData () {
                this.formData = Object.assign({}, {
                    actionId: '',
                    actionName: '',
                    actionNameEn: '',
                    actionDesc: '',
                    actionDescEn: '',
                    actionRelatedResourceId: [],
                    actionType: '',
                    hasRelated: false
                })
            },

            async checkActionId (val) {
                if (this.isEdit) {
                    return true
                }
                try {
                    const res = await this.$store.dispatch('iam/checkActionId', {
                        data: {
                            projectId: this.projectId,
                            actionId: val
                        }
                    })
                    return !res.exist
                } catch (e) {
                    console.error(e)
                    return false
                }
            },

            async getRelatedResourceList () {
                this.isLoading = true
                try {
                    const list = await this.$store.dispatch('page/getList', { projectId: this.projectId, versionId: this.versionId })
                    this.relatedResourceList.splice(0, this.relatedResourceList.length, ...list)
                    this.relatedResourceList.forEach(item => {
                        item.name = item.pageName
                    })
                } catch (e) {
                    console.error(e)
                } finally {
                    this.isLoading = false
                }
            },

            validate () {
                this.isChecking = true

                const form = this.$refs.validateForm
                form.validate().then(async () => {
                    try {
                        const params = {
                            // 这里传入 projectId 是为了 /iam/app-perm-model-action 接口 权限中心鉴权
                            projectId: this.projectId,
                            actionId: this.curUpdate.id,
                            fields: {
                                actionId: this.formData.actionId,
                                actionName: this.formData.actionName,
                                actionNameEn: this.formData.actionNameEn,
                                actionDesc: this.formData.actionDesc || '',
                                actionDescEn: this.formData.actionDescEn || '',
                                actionRelatedResourceId: this.formData.hasRelated ? (this.formData.actionRelatedResourceId || []) : [],
                                actionType: this.formData.actionType || ''
                            }
                        }
                        if (this.isEdit) {
                            // 之前已同步到权限中心的操作
                            if (this.curUpdate.registeredStatus === 1) {
                                params.fields.registeredStatus = -1
                            }
                            await this.$store.dispatch('iam/updateIamAppPermAction', { data: params })
                        } else {
                            await this.$store.dispatch('iam/addIamAppPermAction', {
                                data: {
                                    projectId: Number(this.projectId),
                                    iamAppPermId: this.iamAppPerm.id,
                                    ...params.fields
                                }
                            })
                        }
                        this.$emit('success')
                    } catch (e) {
                        console.error(e)
                    }
                }, () => {
                    this.isChecking = false
                })
            },

            /**
             * 隐藏创建 sideslider
             */
            hide () {
                this.$emit('hide-sideslider', false)
                this.resetFormData()
                this.isChecking = false
                const form = this.$refs.validateForm
                form && form.clearError()
            },
            showUpdate (row) {
                this.isShowSideslider = true
                this.curUpdate = Object.assign({}, row)
            },

            hideSideslider () {
                this.isShowSideslider = false
                this.curUpdate = Object.assign({}, {})
            },

            async sidesliderSuccess () {
                this.hideSideslider()
                this.setLoading(true)
                setTimeout(async () => {
                    await this.preload()
                    this.setLoading(false)
                }, 300)
            },

            deleteAction (row) {
                if (row.actionId === IAM_APP_PERM_BUILDIN_ACTION) {
                    return
                }
                console.error(row)
            }
        }
    }

</script>

<style lang="postcss" scoped>
    .create-sideslider {
        .wrapper {
            width: 100%;
            height: calc(100vh - 60px);
            padding: 30px 25px;
        }
    }

</style>
