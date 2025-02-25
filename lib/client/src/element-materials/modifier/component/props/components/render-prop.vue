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
    <div class="modifier-prop">
        <variable-select
            :show="!isReadOnly && variableSelectEnable"
            :options="variableSelectOptions"
            :value="formData"
            :show-content="isShowProp"
            :describe="describe"
            @change="handleVariableFormatChange">
            <template v-slot:title>
                <div class="prop-name" @click="toggleShowProp">
                    <i
                        :class="{
                            'bk-icon icon-angle-down': true,
                            close: !isShowProp
                        }"
                    ></i>
                    <span
                        :class="{ label: describe.tips }"
                        v-bk-tooltips="introTips">
                        {{ displayName }}
                    </span>
                </div>
            </template>

            <template v-if="showInnerVariable">
                <span class="g-prop-sub-title g-mb6">变量类型</span>
                <choose-build-in-variable
                    class="g-mb4"
                    :build-in-variable="buildInVariable"
                    :build-in-variable-type="formData.buildInVariableType"
                    :component-id="componentId"
                    :name="name"
                    :payload="formData.payload"
                    :render-value="formData.renderValue"
                    :option="variableSelectOptions"
                    @change="handleBuildInVariableChange"
                />
            </template>

            <template v-if="renderComponentList.length > 1">
                <span class="g-prop-sub-title g-mb6 g-mt8" v-if="showInnerVariable">属性初始值来源</span>
                <bk-radio-group
                    class="g-prop-radio-group mb12"
                    :value="selectValueType"
                    @change="handleValueTypeChange">
                    <bk-radio-button
                        v-for="item in renderComponentList"
                        :key="item.type"
                        :value="item.valueType">
                        {{ item.valueType | valueTypeTextFormat }}
                    </bk-radio-button>
                </bk-radio-group>
            </template>
            <div
                v-if="isRenderValueCom"
                class="prop-action">
                <template v-for="(renderCom, index) in renderComponentList">
                    <!-- 控件类型或者值的类型匹配都将展示，如：控制类型为 src 值的类型为 string(支持src输入加选择模式之前) 都需展示 -->
                    <template v-if="selectValueType === renderCom.type || selectValueType === renderCom.valueType">
                        <component
                            :is="renderCom.component"
                            :component-type="componentType"
                            :component-id="componentId"
                            :name="name"
                            :type="renderCom.type"
                            :describe="describe"
                            :default-value="propTypeValueMemo[selectValueType].val"
                            :payload="formData.payload"
                            :remote-validate="describe.remoteValidate"
                            :key="`${renderCom.type}_${index}`"
                            :readonly="isReadOnly"
                            :change="handleCodeChange"
                            v-bind="describe.bindProps" />
                    </template>
                </template>
            </div>

            <template v-if="describe.operation">
                <div
                    v-bk-tooltips="{
                        content: describe.operation.tips,
                        placement: 'left-start',
                        boundary: 'window'
                    }"
                    :class="[
                        'g-prop-sub-title g-mb6 g-mt12',
                        {
                            'g-config-subline': describe.operation.tips
                        }
                    ]"
                >
                    {{ describe.operation.title }}
                </div>
                <bk-button
                    class="prop-operation"
                    size="small"
                    @click="describe.operation.click(formData, syncSlot)"
                >
                    {{ describe.operation.name }}
                </bk-button>
            </template>
        </variable-select>
    </div>
</template>
<script>
    import _ from 'lodash'
    import { mapActions } from 'vuex'
    import LC from '@/element-materials/core'
    import { camelCase, camelCaseTransformMerge } from 'change-case'
    import { transformTipsWidth } from '@/common/util'
    import safeStringify from '@/common/json-safe-stringify'
    import variableSelect from '@/components/variable/variable-select'
    import chooseBuildInVariable from '@/components/variable/choose-build-in-variable'
    import {
        determineShowPropInnerVariable,
        BUILDIN_VARIABLE_TYPE_LIST
    } from 'shared/variable'

    import {
        getDefaultValueByType,
        isEmpty,
        toPascal
    } from 'shared/util'

    import TypeSize from './strategy/size'
    import TypeRemote from './strategy/remote'
    import TypeFunction from './strategy/function'
    import TypeBoolean from './strategy/boolean'
    import TypeNumber from './strategy/number'
    import TypeFloat from './strategy/float'
    import TypeSelect from './strategy/select'
    import TypeString from './strategy/string'
    import TypeTextarea from './strategy/textarea'
    import TypeText from './strategy/text'
    import TypeTableColumn from './strategy/table-column'
    import TypeCollapse from './strategy/collapse.vue'
    import TypeJson from './strategy/json-view.vue'
    import TypeHtml from './strategy/html.vue'
    import TypeFreeLayoutItem from './strategy/free-layout-item.vue'
    import TypeList from './strategy/list.vue'
    import TypeIcon from './strategy/icon'
    import TypeVanIcon from './strategy/van-icon'
    import TypeColor from './strategy/color'
    import TypleElProps from './strategy/el-props'
    import TypeDataSource from './strategy/data-source.vue'
    import TypeTableDataSource from './strategy/table-data-source.vue'
    import TypeSrc from './strategy/src.vue'
    import TypePagination from './strategy/pagination.vue'
    import TypeRouteList from './strategy/route-list.vue'
    import TypeChartColor from './strategy/chart-color-set.vue'

    const getRealValue = (type, target) => {
        if (type === 'object') {
            const FunctionCon = Function
            return (new FunctionCon(`return ${safeStringify(target)}`))()
        }
        return target
    }

    // 属性类型转为该变量接受的值类型
    const getPropValueType = (type) => {
        const valueMap = {
            'size': 'string',
            'text': 'string',
            'paragraph': 'string',
            'html': 'string',
            'json': 'object',
            'icon': 'string',
            'van-icon': 'string',
            'float': 'number',
            'src': 'string',
            'srcset': 'array',
            // 老数据存在 type = 'hidden' 但是值是 object 的情况
            'hidden': 'object',
            'pagination': 'object'
        }
        return valueMap[type] || type
    }

    export default {
        name: 'render-prop-modifier',
        components: {
            variableSelect,
            chooseBuildInVariable
        },
        filters: {
            valueTypeTextFormat (valueType) {
                const textMap = {
                    'areatext': '文本',
                    'number': '数字',
                    'object': '对象',
                    'string': '字符串',
                    'array': '数组',
                    'remote': '函数',
                    'data-source': '数据表',
                    'table-data-source': '数据表',
                    'srcset': '图片列表'
                }
                return textMap[valueType] || toPascal(valueType)
            }
        },
        props: {
            componentType: String,
            componentId: {
                type: String
            },
            // prop 的 name
            name: {
                type: String,
                required: true
            },
            // prop 的 配置
            describe: {
                type: Object,
                required: true
            },
            // 用户的配置的值
            lastValue: {
                type: [Number, String, Boolean, Object, Array],
                default: () => ({})
            },
            syncSlot: {
                type: Function
            }
        },
        data () {
            return {
                selectValueType: '',
                formData: {},
                isRenderValueCom: false,
                isShowProp: true
            }
        },
        computed: {
            /**
             * @desc format 为 value 时 valueType 编辑组件
             * @returns { Object }
             */
            renderComponentList () {
                const config = this.describe
                const comMap = {
                    'areatext': TypeTextarea,
                    'boolean': TypeBoolean,
                    'size': TypeSize,
                    'number': TypeNumber,
                    'float': TypeFloat,
                    'select': TypeSelect,
                    'string': TypeString,
                    'text': TypeText,
                    'table-column': TypeTableColumn,
                    'collapse': TypeCollapse,
                    'remote': TypeRemote,
                    'json': TypeJson,
                    'html': TypeHtml,
                    'free-layout-item': TypeFreeLayoutItem,
                    'icon': TypeIcon,
                    'van-icon': TypeVanIcon,
                    'color': TypeColor,
                    'step': TypeList,
                    'function': TypeFunction,
                    'el-props': TypleElProps,
                    'data-source': TypeDataSource,
                    'table-data-source': TypeTableDataSource,
                    'src': TypeSrc,
                    'srcset': TypeList,
                    'pagination': TypePagination,
                    'route': TypeRouteList,
                    'chartColor': TypeChartColor
                }

                const typeMap = {
                    'array': 'json',
                    'boolean': 'boolean',
                    'column': 'column',
                    'size': 'size',
                    'number': 'number',
                    'float': 'float',
                    'object': 'json',
                    'string': 'string',
                    'text': 'text',
                    'paragraph': 'text',
                    'tab-panel': 'tab-panel',
                    'radio': 'radio',
                    'radio-button': 'radio-button',
                    'checkbox': 'checkbox',
                    'table-column': 'table-column',
                    'option': 'option',
                    'collapse': 'collapse',
                    'remote': 'remote',
                    'json': 'json',
                    'html': 'html',
                    'free-layout-item': 'free-layout-item',
                    'bread-crumb': 'bread-crumb',
                    'icon': 'icon',
                    'van-icon': 'van-icon',
                    'form-item': 'form-item',
                    'color': 'color',
                    'step': 'step',
                    'function': 'function',
                    'el-step': 'el-step',
                    'timeline': 'timeline',
                    'carousel': 'carousel',
                    'el-radio': 'el-radio',
                    'el-checkbox': 'el-checkbox',
                    'el-props': 'el-props',
                    'data-source': 'data-source',
                    'table-data-source': 'table-data-source',
                    'src': 'src',
                    'srcset': 'srcset',
                    'pagination': 'pagination',
                    'route': 'route',
                    'chartColor': 'chartColor'
                }

                let realType = config.type
                // 属性type支持配置数组，内部逻辑全部按数组处理
                if (typeof config.type === 'string') {
                    realType = [config.type]
                }

                return realType.reduce((res, propType) => {
                    if (typeMap.hasOwnProperty(propType)) {
                        const renderType = Array.isArray(config.options) ? 'select' : typeMap[propType]
                        res.push({
                            type: propType,
                            component: comMap[renderType],
                            valueType: getPropValueType(propType)
                        })
                    }
                    return res
                }, [])
            },
            /**
             * @desc prop name
             * @returns { String }
             */
            displayName () {
                if (this.renderComponentList.length > 1) {
                    return this.name
                }
                const [editCom] = this.renderComponentList
                return `${this.name}(${toPascal(editCom.valueType)})`
            },
            /**
             * @desc 不支持的变量切换类型(variable、expression)
             * @returns { Array }
             */
            disableVariableType () {
                return this.describe.disableVariableType ? this.describe.disableVariableType : []
            },
            /**
             * @desc prop 描述 tips
             * @returns { Object }
             */
            introTips () {
                const tip = transformTipsWidth(this.describe.tips)
                const commonOptions = {
                    disabled: !tip,
                    interactive: false,
                    placements: ['left-start'],
                    boundary: 'window'
                }
                return typeof tip === 'string'
                    ? {
                        ...commonOptions,
                        content: tip
                    }
                    : Object.assign(tip, commonOptions)
            },
            /**
             * @desc type 支持 remote 类型的不支持配置变量
             * @returns { Boolean }
             */
            variableSelectEnable () {
                return !this.renderComponentList.some(com => com.type === 'remote')
            },
            /**
             * @desc 是否展示内置变量
             * @returns { Boolean }
             */
            showInnerVariable () {
                return determineShowPropInnerVariable(this.describe.type, this.name, this.componentType)
            },
            /**
             * 内置变量名
             */
            buildInVariable () {
                const perVariableName = camelCase(this.componentId, { transform: camelCaseTransformMerge })
                const isChart = this.componentType === 'chart'
                let buildInVariable
                if (isChart) {
                    buildInVariable = perVariableName
                } else {
                    buildInVariable = `${perVariableName}${camelCase(this.name, { transform: camelCaseTransformMerge })}`
                }
                return buildInVariable
            },
            isFormModel () {
                return this.componentType === 'widget-form' && this.name === 'model'
            }
        },
        watch: {
            lastValue: {
                handler (lastValue) {
                    if (this.isInnerChange) {
                        this.isInnerChange = false
                        return
                    }
                    setTimeout(() => {
                        if (lastValue && lastValue.valueType) {
                            // fix: 旧数据存在 valueType 是数组的情况
                            const lastValueType = Array.isArray(lastValue.valueType)
                                ? lastValue.valueType[0]
                                : lastValue.valueType
                            this.formData = Object.freeze({
                                ...this.formData,
                                format: lastValue.format,
                                code: lastValue.code,
                                valueType: getPropValueType(lastValueType),
                                buildInVariableType: lastValue.buildInVariableType,
                                payload: lastValue.payload || {},
                                renderValue: lastValue.renderValue
                            })
                            this.propTypeValueMemo[this.formData.valueType] = {
                                val: lastValue.renderValue
                            }
                        }
                        this.selectValueType = this.formData.valueType
                        this.isRenderValueCom = true
                    })
                },
                immediate: true
            }
        },
        created () {
            this.isReadOnly = this.isFormModel
            const {
                type,
                val
            } = this.describe
            // 属性各个交互类型可以接受的值类型
            const valueTypes = (Array.isArray(type) ? type : [type]).map(getPropValueType)
            // 该属性的默认值
            const defaultValue = val !== undefined ? val : getDefaultValueByType(valueTypes[0])
            this.defaultValue = _.cloneDeep(defaultValue)

            // 构造 variable-select 的配置
            this.variableSelectOptions = {
                type: 'v-bind',
                prop: this.name,
                format: 'value',
                formatInclude: ['value', 'variable', 'expression'],
                code: defaultValue,
                valueTypeInclude: valueTypes
            }

            // prop 的初始值
            this.formData = Object.freeze({
                format: 'value',
                code: defaultValue,
                valueType: valueTypes[0],
                renderValue: defaultValue,
                buildInVariableType: '',
                payload: this.lastValue.payload || {}
            })

            // 编辑状态缓存
            this.propTypeValueMemo = {
                [this.formData.valueType]: {
                    val: this.formData.renderValue
                }
            }
        },
        methods: {
            ...mapActions('variable', ['updateVariable']),
            /**
             * @desc 同步更新用户操作
             */
            triggerChange (formData = this.formData) {
                this.isInnerChange = true
                // 缓存用户本地编辑值
                this.propTypeValueMemo[formData.valueType] = {
                    val: formData.renderValue
                }

                this.$emit('on-change', this.name, {
                    ...formData,
                    modifiers: this.describe.modifiers || []
                })
            },
            /**
             * @desc 右上角类型切换，format: value | variable | expression
             * @param { Object } variableSelectData
             */
            handleVariableFormatChange (variableSelectData) {
                const {
                    format
                } = variableSelectData
                let {
                    code,
                    renderValue
                } = variableSelectData

                // 切换 format 时还没设置具体值 renderValue 取默认配置
                if (isEmpty(renderValue)) {
                    if (this.propTypeValueMemo[this.formData.valueType]) {
                        renderValue = this.propTypeValueMemo[this.formData.valueType].val
                    } else {
                        renderValue = _.cloneDeep(this.defaultValue)
                    }
                }
                // format 切换为 value 时，将 renderValue 回调到 code
                if (format === 'value' && code === '') {
                    code = renderValue
                }

                this.formData = Object.freeze({
                    ...this.formData,
                    format,
                    code,
                    renderValue
                })
                this.triggerChange()
            },
            /**
             * @desc format 等于 value 时 value 的类型切换
             * @param { String } valueType
             */
            handleValueTypeChange (valueType) {
                const realValueType = getPropValueType(valueType)
                this.selectValueType = realValueType

                let code = null
                if (this.propTypeValueMemo.hasOwnProperty(realValueType)) {
                    code = this.propTypeValueMemo[realValueType].val
                } else if ([
                    'remote',
                    'data-source',
                    'table-data-source'
                ].includes(realValueType)) {
                    // 切换到数据表和远程函数此时还没有获取API数据
                    // code 和 rendervalue 保持不变
                    code = _.cloneDeep(this.formData.renderValue)
                } else {
                    // 切换值类型时，通过类型获取默认值
                    code = getDefaultValueByType(getPropValueType(realValueType))
                }

                this.formData = Object.freeze({
                    ...this.formData,
                    code,
                    valueType: realValueType,
                    renderValue: code
                })

                this.triggerChange()
                this.triggerUpdateVariable()
            },
            /**
             * @desc format 等于 value 时 编辑 code
             * @param { String } name
             * @param { Any } value
             * @param { String } type
             * @param { Object } payload prop 配置附带的额外信息(eq: type 为 remote 时接口函数相关的配置)
             */
            handleCodeChange (name, value, type, payload = {}) {
                // 快速切换的情况下，如果type对不上，就不更新
                if (this.formData.valueType !== getPropValueType(type)) return
                try {
                    let code = null
                    let renderValue = this.formData.renderValue

                    let val = getRealValue(type, value)

                    // 防止数据量太大，画布区卡死
                    if (Array.isArray(val)
                        && val.length > 100
                        && ['remote', 'table-data-source', 'data-source', 'select-data-source'].includes(this.formData.valueType)
                    ) {
                        val = val.slice(0, 100)
                        this.messageInfo(`属性【${name}】的值大于 100 条，画布区限制渲染 100 条。实际数据请在预览或者部署后查看`)
                    }

                    if (this.formData.valueType === 'remote') {
                        // 配置的是远程函数、数据源
                        // code 此时无效，设置为 null
                        // api 返回数据不为空时在画布编辑区才应用 api 数据
                        if (!isEmpty(val)) {
                            renderValue = val
                            code = val
                        }
                    } else {
                        code = val
                        renderValue = val
                    }

                    this.formData = Object.freeze({
                        ...this.formData,
                        code,
                        payload: Object.assign(this.formData.payload, payload),
                        renderValue
                    })
                    this.triggerChange()
                    this.triggerUpdateVariable()
                } catch {
                    this.$bkMessage({
                        theme: 'error',
                        message: `属性【${name}】的值设置不正确`
                    })
                }
            },

            handleBuildInVariableChange ({ buildInVariableType, payload }) {
                console.log(this.buildInVariable, buildInVariableType, payload, this.componentNode, LC.getActiveNode())
                
                if (this.isFormModel) {
                    // 每个formItem中表单组件v-model的变量名替换成formModel选择的变量名
                    this.replaceFormItemVmodelKey(LC.getActiveNode(), buildInVariableType, payload, this.buildInVariable)
                }
                this.formData = Object.freeze({
                    ...this.formData,
                    buildInVariableType,
                    payload: Object.assign(this.formData.payload, payload)
                })
                this.triggerChange()
                this.triggerUpdateVariable()
            },

            triggerUpdateVariable () {
                // 如果是自定义变量需要更新变量列表
                if (this.formData.buildInVariableType === BUILDIN_VARIABLE_TYPE_LIST[1].VAL) {
                    this.updateVariable({
                        [this.formData.payload.customVariableCode]: this.formData.renderValue
                    })
                }
            },

            toggleShowProp () {
                this.isShowProp = !this.isShowProp
            },

            // 每个formItem中表单组件v-model的变量名替换成formModel选择的变量名
            replaceFormItemVmodelKey (formNode = {}, buildInVariableType, payload, buildInVariable) {
                let formModelKey = `${buildInVariable}model`
                if (buildInVariableType === 'CUSTOM' && payload?.customVariableCode) {
                    formModelKey = payload.customVariableCode
                }
                formNode.children.forEach(formItemNode => {
                    formItemNode.children.forEach(inputNode => {
                        inputNode.renderDirectives.forEach(directiveItem => {
                            if (directiveItem.type === 'v-model') {
                                directiveItem.code = `${formModelKey}.${formItemNode.prop.property}`
                            }
                        })
                    })
                })
            }
        }
    }
</script>
<style lang="postcss">
    .item-ghost {
        border: 1px dashed #3a84ff;
        background: #fff !important;
        color: #fff !important;
        height: 32px;
        .bk-form-control, .bk-drag-icon, .bk-icon, .label {
            display: none;
        }
    }
    .block-item-ghost {
        border: 1px dashed #3a84ff;
        background: #fff !important;
        color: #fff !important;
        height: 100px;
        .bk-form-control, .bk-icon, .bk-drag-icon, .label, .bk-form-radio, .bk-select, .bk-form-checkbox {
            display: none;
        }
    }
    .option-col-operate {
        position: absolute;
        right: 12px;
        color: #979BA5;
        display: none;
        font-size: 24px;
        .option-col-del {
            cursor: pointer;
        }
        .option-col-drag {
            cursor: move;
            margin-right: -10px;
            padding-left: 215px;
        }
    }
    .modifier-prop {
        margin: 0 10px;
        .prop-name {
            height: 40px;
            font-size: 12px;
            font-weight: bold;
            color: #313238;
            word-break: keep-all;
            width: 100%;
            display: flex;
            align-items: center;
            border-top: 1px solid #EAEBF0;
            cursor: pointer;
            .label {
                border-bottom: 1px dashed #313238;
                cursor: pointer;
                max-width: calc(100% - 65px);
                line-height: 19px;
                display: inline-block;
            }
            span {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .icon-angle-down {
                cursor: pointer;
                font-size: 20px;
                margin-left: -5px;
                margin-right: 3px;
                transition: transform 200ms;
                &.close {
                    transform: rotate(-90deg);
                }
            }
        }
        .prop-action {
            width: 100%;
        }
        .prop-operation {
            display: block;
        }
        .mb12 {
            margin-bottom: 12px
        }
    }
</style>
