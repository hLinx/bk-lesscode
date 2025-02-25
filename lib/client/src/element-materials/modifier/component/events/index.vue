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
    <section v-if="configEvents.length">
        <h3
            class="empty-event"
            v-if="Object.keys(renderEvents).length <= 0"
        >
            <img src="../../../../images/empty-event.png" />
            <span class="event-tip">可添加丰富的事件，以实现复杂的业务需求</span>
        </h3>
        <ul>
            <render-event
                v-for="(eventValue, eventName) in renderEvents"
                :key="eventName"
                :event-name="eventName"
                :event-value="eventValue"
                :event-config="getEventConfig(eventName)"
                @update="handleUpdateEvent"
                @minus="handleMinusEvent"
            />
        </ul>
        <plus-event
            :config-events="configEvents"
            :render-events="renderEvents"
            :node="currentComponentNode"
            @plus-event="handlePlusEvent"
        />
    </section>
</template>

<script>
    import _ from 'lodash'
    import jsonSafeStringify from '@/common/json-safe-stringify'
    import LC from '@/element-materials/core'
    import PlusEvent from './children/plus-event.vue'
    import RenderEvent from './children/render-event.vue'

    export default {
        name: 'modifier-events',

        components: {
            PlusEvent,
            RenderEvent
        },

        data () {
            return {
                configEvents: [],
                renderEvents: {},
                currentComponentNode: {}
            }
        },

        created () {
            this.currentComponentNode = LC.getActiveNode()
            const {
                material,
                renderEvents
            } = this.currentComponentNode
            this.configEvents = Object.freeze(material.events || [])
            // 兼容老数据展示
            Object.keys(renderEvents || {}).forEach((key) => {
                const renderEvent = renderEvents[key]
                if (typeof renderEvent === 'string') {
                    this.renderEvents[key] = {
                        enable: true,
                        methodCode: renderEvent,
                        params: []
                    }
                } else {
                    this.renderEvents[key] = renderEvent
                }
            })
            // this.renderEvents = Object.assign({}, renderEvents)

            const updateCallback = _.debounce(() => {
                if (jsonSafeStringify(this.renderEvents) === jsonSafeStringify(this.currentComponentNode.renderEvents)) {
                    return
                }
                this.renderEvents = _.cloneDeep(this.currentComponentNode.renderEvents)
            }, 100)

            LC.addEventListener('mergeRenderEvents', updateCallback)
            this.$once('hook:beforeDestroy', () => {
                LC.removeEventListener('mergeRenderEvents', updateCallback)
            })
        },

        methods: {
            getEventConfig (eventName) {
                return this.configEvents.find(configEvent => configEvent.name === eventName) || {}
            },

            handlePlusEvent (event) {
                this.renderEvents = {
                    ...this.renderEvents,
                    [event.name]: {
                        enable: true,
                        methodCode: '',
                        params: []
                    }
                }
                this.updateTargetData()
            },

            handleMinusEvent (eventName) {
                this.$delete(this.renderEvents, eventName)
                this.updateTargetData()
            },

            handleUpdateEvent (renderEvents) {
                this.renderEvents = {
                    ...this.renderEvents,
                    ...renderEvents
                }
                this.updateTargetData()
            },

            updateTargetData () {
                this.currentComponentNode.setRenderEvents(this.renderEvents)
            }
        }
    }
</script>

<style lang='postcss' scoped>
    .event-tip {
        margin: 10px;
        padding: 0;
        font-size: 12px;
        font-weight: normal;
    }
    .empty-event {
        display: flex;
        align-items: center;
        flex-direction: column;
        margin: 21px 0 6px;
        img {
            width: 66px;
            height: 66px;
        }
    }
</style>
