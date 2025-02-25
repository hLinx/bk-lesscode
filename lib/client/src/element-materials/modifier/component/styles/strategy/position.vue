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
    <style-layout title="定位">
        <style-item name="position">
            <bk-select
                :value="positionValue"
                font-size="medium"
                placeholder="请选择"
                @change="handlePositionChange"
                style="width: 100%;">
                <bk-option id="absolute" name="absolute" v-bk-tooltips="getTooltipsConfig('元素会被移出正常文档流，并不为元素预留空间，通过指定元素相对于最近的非 static 定位祖先元素的偏移，来确定元素位置')" />
                <bk-option id="fixed" name="fixed" v-bk-tooltips="getTooltipsConfig('元素会被移出正常文档流，并不为元素预留空间，而是通过指定元素相对于屏幕视口（viewport）的位置来指定元素位置')" />
                <bk-option id="static" name="static" v-bk-tooltips="getTooltipsConfig('使用正常的布局行为，即元素在文档常规流中当前的布局位置。此时 top, right, bottom, left 和 z-index 属性无效')" />
                <bk-option id="unset" name="unset" v-bk-tooltips="getTooltipsConfig('未设置')" />
            </bk-select>
        </style-item>
        <template v-if="positionValue && positionValue !== 'static' && positionValue !== 'unset'">
            <style-item :name="item.name" v-for="item in posConfigRender" :key="item.key">
                <size-input
                    :value="item.value"
                    :is-natural="false"
                    :min="-Infinity"
                    @change="handleInputChange(item, $event)">
                    <append-select
                        v-if="item.key !== 'zIndex'"
                        :value="item.unit"
                        @change="handleSelectChange(item, $event)" />
                </size-input>
            </style-item>
        </template>
    </style-layout>
</template>

<script>
    import StyleLayout from '../layout/index'
    import StyleItem from '../layout/item'
    import AppendSelect from '@/components/modifier/append-select'
    import SizeInput from '@/components/modifier/size-input'
    import { splitValueAndUnit } from '@/common/util'
    import { getCssProperties, getTooltipsConfig } from '../common/util'
    import defaultUnitMixin from '@/common/defaultUnit.mixin'

    const posConfig = [
        {
            name: 'top',
            key: 'top'
        },
        {
            name: 'left',
            key: 'left'
        },
        {
            name: 'right',
            key: 'right'
        },
        {
            name: 'bottom',
            key: 'bottom'
        },
        {
            name: 'z-index',
            key: 'zIndex'
        }
    ]
    
    export default {
        components: {
            StyleLayout,
            StyleItem,
            AppendSelect,
            SizeInput
        },
        mixins: [defaultUnitMixin],
        props: {
            value: {
                type: Object,
                required: true
            },
            include: {
                type: Array
            },
            exclude: {
                type: Array
            },
            change: {
                type: Function,
                required: true
            }
        },
        data () {
            return {
                positionValue: this.value.position || '',
                posConfigRender: []
            }
        },
        mounted () {
            this.handleInitValueList()
        },
        methods: {
            handleInitValueList () {
                let result = getCssProperties(posConfig, this.include, this.exclude)
                const that = this
                result = result.map((item) => {
                    if (item.key === 'zIndex') {
                        item['value'] = that.value[item.key] || ''
                    } else {
                        item['value'] = splitValueAndUnit('value', that.value[item.key])
                        item['unit'] = splitValueAndUnit('unit', that.value[item.key]) || this.defaultUnit
                    }
                    return item
                })
                this.posConfigRender = result
            },
            handleInputChange (item, val) {
                item.value = val
                const unit = item.key !== 'zIndex' ? item.unit : ''
                const newValue = val === '' ? '' : val + unit
                this.change(item.key, newValue)
            },
            handleSelectChange (item, unit) {
                if (item.value !== '') {
                    item.unit = unit
                    item.value = Math.min(item.value, unit === '%' ? 100 : item.value)
                    this.change(item.key, item.value + unit)
                }
            },
            handlePositionChange (val) {
                this.posConfigRender.forEach(item => {
                    this.handleSelectChange(item, 'px')
                    this.handleInputChange(item, '')
                })
                this.positionValue = val
                this.change('position', val)
            },
            getTooltipsConfig
        }
    }
</script>
