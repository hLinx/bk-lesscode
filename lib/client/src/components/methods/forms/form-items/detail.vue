<template>
    <lc-form :label-width="180" :model="form" ref="funcForm" :form-type="formType" class="func-detail">
        <lc-form-item label="函数类型" property="funcType" class="func-form-item">
            <bk-radio-group
                :value="form.funcType"
                @change="(funcType) => updateValue({ funcType })"
            >
                <bk-radio-button
                    v-for="temp in tempList"
                    :value="temp.id"
                    :key="temp.id"
                    :disabled="disabled && form.funcType !== temp.id"
                    class="func-temp"
                >
                    {{ temp.name }}
                    <i
                        class="bk-icon icon-info ml5"
                        v-if="temp.info"
                        v-bk-tooltips="{ content: temp.info, allowHtml: true }"
                    ></i>
                </bk-radio-button>
            </bk-radio-group>
        </lc-form-item>
        <lc-form-item
            label="函数调用参数"
            ref="funcParams"
            property="funcParams"
            error-display-type="normal"
            class="func-form-item"
            :rules="[getParamRule('函数调用参数')]"
            :desc="{ width: 350, content: '调用该函数传入的参数列表，如果函数用于组件事件，则这里是组件事件回调的参数，组件事件回调参数具体可见组件文档。' }">
            <dynamic-tag
                :disabled="disabled"
                v-model="form.funcParams"
                @change="(val) => tagChange('funcParams', val)">
            </dynamic-tag>
        </lc-form-item>
        <template v-if="form.funcType === 1">
            <lc-form-item
                label="Api"
                property="apiChoosePath"
                error-display-type="normal"
                desc="使用 Api 管理的 api 做为模板，快速生成远程函数"
                class="func-form-item"
            >
                <choose-api
                    :value="form.apiChoosePath"
                    :disabled="disabled"
                    @change="handleSelectApi"
                ></choose-api>
            </lc-form-item>
            <lc-form-item
                ref="funcApiUrl"
                label="请求地址"
                property="funcApiUrl"
                error-display-type="normal"
                class="func-form-item"
                desc="1. 请求地址中可以使用 {变量标识} 的格式来使用变量。<br> 2. 应用自建 API 和 数据表操作 API 的地址不可修改，每次执行实时获取 API 地址 <br> 3. 如果地址中有*，表示可以匹配任意字符串，请替换成真实的路径"
                :required="true"
                :rules="[requireRule('请求地址')]"
            >
                <bk-input
                    v-bkloading="{ isLoading: isLoadingUrl }"
                    :value="form.funcApiUrl"
                    :disabled="disableEditUrl"
                    @change="(funcApiUrl) => updateValue({ funcApiUrl })"
                ></bk-input>
            </lc-form-item>
            <lc-form-item
                label="请求类型"
                property="funcMethod"
                error-display-type="normal"
                class="func-form-item"
                :required="true"
                :rules="[requireRule('请求类型')]"
            >
                <bk-select
                    :value="form.funcMethod"
                    :clearable="false"
                    :popover-options="{ appendTo: 'parent' }"
                    :disabled="disabled"
                    @selected="(funcMethod) => updateValue({ funcMethod })"
                >
                    <bk-option v-for="(apiMethodKey, apiMethodName) in API_METHOD"
                        :key="apiMethodKey"
                        :id="apiMethodKey"
                        :name="apiMethodName">
                    </bk-option>
                </bk-select>
            </lc-form-item>
            <bk-button
                class="get-remote-response bk-form-item func-form-item"
                size="small"
                :loading="isLoadingResponse"
                @click="getRemoteResponse"
            >获取接口返回数据</bk-button>
            <lc-form-item
                v-if="METHODS_WITHOUT_DATA.includes(form.funcMethod)"
                label="请求参数"
                property="remoteParams"
                error-display-type="normal"
                class="func-form-item">
                <query-params
                    class="mt38"
                    :query="form.apiQuery"
                    :disabled="disabled"
                    :variable-list="variableList"
                    @change="(apiQuery) => updateValue({ apiQuery })"
                ></query-params>
            </lc-form-item>
            <lc-form-item
                v-else
                label="请求参数"
                property="remoteParams"
                error-display-type="normal"
                class="func-form-item">
                <body-params
                    class="mt38"
                    :body="form.apiBody"
                    :disabled="disabled"
                    :variable-list="variableList"
                    @change="(apiBody) => updateValue({ apiBody })"
                >
                </body-params>
            </lc-form-item>
            <lc-form-item
                label="接口返回数据参数名"
                ref="remoteParams"
                property="remoteParams"
                error-display-type="normal"
                desc="该参数用于接收Api返回数据，在函数中直接可使用该变量名来操作Api返回数据"
                class="func-form-item"
                :rules="[getParamRule('接口返回数据参数名')]">
                <dynamic-tag
                    :disabled="disabled"
                    v-model="form.remoteParams"
                    @change="(val) => tagChange('remoteParams', val)">
                </dynamic-tag>
            </lc-form-item>
        </template>
        <bk-dialog
            width="1000"
            title="查看接口返回值"
            v-model="showFuncResponse.show"
        >
            <monaco
                height="600"
                :read-only="true"
                :value="showFuncResponse.code"
            />
        </bk-dialog>
    </lc-form>
</template>

<script>
    import { mapGetters } from 'vuex'
    import mixins from './form-item-mixins'
    import DynamicTag from '@/components/dynamic-tag.vue'
    import QueryParams from './children/query-params.vue'
    import BodyParams from './children/body-params.vue'
    import Monaco from '@/components/monaco'
    import ChooseApi from '@/components/api/choose-api.vue'
    import {
        FUNCTION_TYPE,
        replaceFuncParam
    } from 'shared/function/'
    import {
        METHODS_WITHOUT_DATA,
        API_METHOD,
        parseScheme2UseScheme,
        parseScheme2Value,
        LCGetParamsVal,
        getParamFromApi
    } from 'shared/api'
    import {
        getVariableValue
    } from 'shared/variable'

    export default {
        components: {
            DynamicTag,
            QueryParams,
            BodyParams,
            Monaco,
            ChooseApi
        },

        mixins: [mixins],

        props: {
            requireSummary: {
                type: Boolean,
                default: false
            },
            variableList: {
                type: Array,
                default: () => ([])
            }
        },

        data () {
            return {
                tempList: [
                    { id: FUNCTION_TYPE.EMPTY, name: '空白函数' },
                    { id: FUNCTION_TYPE.REMOTE, name: '远程函数', info: '建议以下几种情况使用 "远程函数":<br>1、远程API需要携带用户登录态认证<br>2、远程API无法跨域或纯前端访问' }
                ],
                isLoadingResponse: false,
                METHODS_WITHOUT_DATA,
                API_METHOD,
                showFuncResponse: {
                    show: false,
                    code: ''
                },
                isLoadingUrl: false
            }
        },

        computed: {
            ...mapGetters('projectVersion', ['currentVersionId']),

            projectId () {
                return parseInt(this.$route.params.projectId)
            },

            disableEditUrl () {
                return this.disabled || this.form?.apiChoosePath?.some(path => ['datasource-api', 'lesscode-api'].includes(path.id))
            }
        },

        watch: {
            'form.id': {
                handler () {
                    this.updateUrl()
                },
                immediate: true
            }
        },

        methods: {
            async updateUrl () {
                let funcApiUrl = this.form.funcApiUrl
                const lesscodeApi = this.form?.apiChoosePath?.find(path => path.id === 'lesscode-api')
                if (lesscodeApi) {
                    try {
                        this.isLoadingUrl = true
                        const apiData = await this.$store.dispatch('api/getApiDetail', {
                            code: this.form.apiChoosePath[2].code
                        })
                        funcApiUrl = apiData?.url || this.form.funcApiUrl
                    } catch (error) {
                    }
                    this.isLoadingUrl = false
                }
                this.form.funcApiUrl = funcApiUrl
            },

            tagChange (key, val) {
                this.updateValue({ [key]: val })
                this.$nextTick(() => {
                    this.$refs[key] && this.$refs[key].validate()
                })
            },

            handleSelectApi (api) {
                const apiQuery = api.query.map(parseScheme2UseScheme)
                const apiBody = parseScheme2UseScheme(api.body)
                const funcParams = getParamFromApi(apiQuery, apiBody, api.method)

                this.updateValue({
                    apiChoosePath: api.path,
                    funcApiUrl: api.url,
                    funcMethod: api.method,
                    funcSummary: api.summary,
                    funcParams,
                    apiQuery,
                    apiBody
                })
                // 选择 api 以后，会对地址赋值，这时候需要进行一次校验（组件库blur未检验）
                if (api.url) {
                    this.$nextTick(this.$refs.funcApiUrl.validate)
                }
            },

            getRemoteResponse () {
                this
                    .$refs
                    .funcForm
                    .validate()
                    .then(() => {
                        this.isLoadingResponse = true
                        let apiData = {}
                        if (METHODS_WITHOUT_DATA.includes(this.form.funcMethod)) {
                            this.form.apiQuery.forEach((queryItem) => {
                                apiData[queryItem.name] = parseScheme2Value(queryItem, LCGetParamsVal(this.variableList))
                            })
                        } else {
                            apiData = parseScheme2Value(this.form.apiBody, LCGetParamsVal(this.variableList))
                        }
                        const url = replaceFuncParam(this.form.funcApiUrl, (variableCode) => {
                            const variable = this.variableList.find((variable) => (variable.variableCode === variableCode))
                            if (variable) {
                                return getVariableValue(variable)
                            } else {
                                throw new Error(`函数请求地址里引用的变量【${variableCode}】不存在，请检查并创建该变量`)
                            }
                        })
                        const httpData = {
                            url,
                            type: this.form.funcMethod,
                            apiData,
                            withToken: this.form.withToken
                        }
                        return this
                            .$store
                            .dispatch('getApiData', httpData)
                            .then((res) => {
                                this.showFuncResponse.show = true
                                this.showFuncResponse.code = JSON.stringify(res, null, 4)
                            })
                            .catch((err) => {
                                this.messageError(err.message || err)
                            })
                    })
                    .catch((err) => {
                        this.messageError(err.content || err.message || err)
                    })
                    .finally(() => {
                        this.isLoadingResponse = false
                    })
            },

            getParamRule (label) {
                return {
                    validator: (val) => (val.length <= 0 || val.every(x => /^[A-Za-z]+$/.test(x))),
                    message: `${label}由大小写英文字母组成`,
                    trigger: 'blur'
                }
            }
        }
    }
</script>

<style lang="postcss" scoped>
    .func-detail {
        position: relative;
    }
    .func-temp {
        width: 140px;
        max-width: calc(50% - 5px);
        /deep/ .bk-radio-button-text {
            width: 140px;
            font-size: 12px;
        }
        /deep/ .bk-radio-button-input:disabled+.bk-radio-button-text {
            border-left: 1px solid #dcdee5;
        }
    }
    .get-remote-response {
        position: absolute;
        left: 60px;
        z-index: 2;
        margin-top: 10px !important;
    }
    .add-api-link {
        /deep/ .bk-link-text {
            font-size: 12px;
        }
        .bk-icon {
            margin-right: 5px;
        }
    }
    .mt38 {
        margin-top: 38px;
    }
</style>
