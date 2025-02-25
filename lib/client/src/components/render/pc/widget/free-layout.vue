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
    <div
        :ref="componentData.componentId"
        :class="{
            [$style['free-layout']]: true,
            [$style['empty']]: componentData.children.length < 1
        }"
        :style="componentData.style">
        <Draggable
            :component-data="componentData"
            :list="componentData.slot.default"
            :style="{
                height: componentData.style.height
            }"
            :group="{
                pull: false,
                put: [
                    'component'
                ]
            }"
            :class="$style['wrapper']"
            :ghost-class="$style['drag-ghost']"
            :force-fallback="false"
            @add="handleAdd">
            <resolve-component
                v-for="slotData in componentData.slot.default"
                :ref="slotData.componentId"
                :key="slotData.renderKey"
                :component-data="slotData"
                attach-to-freelayout
                @component-mounted="handleComponentMounted(slotData)"
                @component-mousedown="event => handleComponentMousedown(slotData, event)"
                @component-update="handleComponentUpdate" />
        </Draggable>
    </div>
</template>
<script>
    import LC from '@/element-materials/core'
    import DragLine from '../../common/drag-line'
    import Drag from '../../common/drag'
    import Draggable from '../components/draggable'
    import ResolveComponent from '../resolve-component'
    import { unitFilter } from 'shared/util.js'

    export default {
        name: 'free-layout',
        components: {
            Draggable,
            ResolveComponent
        },
        inheritAttrs: false,
        props: {
            componentData: {
                type: Object,
                default: () => ({})
            }
        },
        created () {
            this.dragLine = null
            this.drag = null

            this.mountedPosition = {
                top: 0,
                left: 0
            }
        },
        methods: {
            /**
             * @desc 拖动元素
             * @param { Node } childNode 子元素对应的节点数据
             */
            doDrag (childNode) {
                if (!this.dragLine) {
                    this.dragLine = new DragLine({
                        container: this.$el
                    })
                }

                const dragEle = this.$refs[childNode.componentId][0].$el

                this.drag = new Drag(dragEle, {
                    container: dragEle.parentNode
                })

                this.dragLine.setContainer(dragEle.parentNode)

                let isMoveing = false

                this.drag.on('move', () => {
                    // fix: 自由布局选中时，直接按住其中的组件然后拖动，之后再松开鼠标，自由布局不会选中的问题
                    LC.getActiveNode() && LC.getActiveNode().activeClear()

                    if (!isMoveing) {
                        LC.triggerEventListener('componentMouserleave')
                        childNode.activeClear()
                    }
                    isMoveing = true
                    this.dragLine.check(this.drag.$elem, '[role="component-root"]')
                }).on('end', () => {
                    this.dragLine.uncheck()
                    const left = parseFloat(this.drag.$elem.style.left)
                    const top = parseFloat(this.drag.$elem.style.top)

                    childNode.setStyle({
                        left: left + 'px',
                        top: top + 'px'
                    })
                    childNode.active()
                    isMoveing = false
                })
            },
            /**
             * @desc 子元素被添加时记录鼠标位置
             * @param { Object } event
             */
            handleAdd (event) {
                const {
                    pageX,
                    pageY
                } = event.originalEvent

                this.mountedPosition = {
                    top: pageY,
                    left: pageX
                }
            },
            /**
             * @desc组件 wrapper mounted 事件回调
             * @param { Node } childNode 子元素对应的节点数据
             */
            handleComponentMounted (childNode) {
                const $elem = this.$refs[childNode.componentId][0].$el

                this.doDrag(childNode)

                // setTimeout 保证 drag add 事件已经处理完毕
                setTimeout(() => {
                    const freeLayoutContainer = this.$refs[this.componentData.componentId]
                    if (!freeLayoutContainer) {
                        return
                    }
                    const {
                        width: componentWidth,
                        height: componentHeight
                    } = $elem

                    const {
                        top: containerTop,
                        right: containerRight,
                        bottom: containerBottom,
                        left: containerLeft
                    } = freeLayoutContainer.getBoundingClientRect()

                    const {
                        top: originalTop,
                        left: originalLeft
                    } = this.mountedPosition

                    let top = 0
                    let left = 0
                    // 组件默认不能超过容器范围
                    // top 位置计算

                    if (childNode.style.top) {
                        top = unitFilter(childNode.style.top)
                    } else {
                        if (originalTop + componentHeight > containerBottom) {
                            top = containerBottom - containerTop - componentHeight
                        } else {
                            top = originalTop - containerTop - 15
                        }
                        top = Math.max(top, 10) + 'px'
                    }
                    // left 位置计算
                    if (childNode.style.left) {
                        left = unitFilter(childNode.style.left)
                    } else {
                        if (originalLeft + componentWidth > containerRight) {
                            left = containerRight - containerLeft - componentWidth
                        } else {
                            left = originalLeft - containerLeft - 15
                        }
                        left = Math.max(left, 10) + 'px'
                    }

                    childNode.setStyle({
                        position: 'absolute',
                        top,
                        left
                    })
                })
            },

            /**
             * @desc组件 组件 wrapper mousedown 事件回调
             * @param { Node } childNode 子元素对应的节点数据
             * @param { Object } event
             */
            handleComponentMousedown (childNode, event) {
                event.stopPropagation()
                event.preventDefault()
                setTimeout(() => {
                    this.doDrag(childNode)
                })
            },
            /**
             * @desc 当 freelayout 内部组件变化时，需要计算所有组件高度，保证 freelayout 在编辑状态尺寸自适应
             */
            handleComponentUpdate () {

            }
        }
    }
</script>
<style lang="postcss" module>
    .free-layout {
        position: relative;
        width: 100%;
        border: 1px dashed #ccc;
        /* 如果基础的 slot 可以拖拽需要设置这个屏蔽掉基础组件上面的 pointer-events: none 效果 */
        pointer-events: all;
        &.empty{
            background: #FAFBFD;
            &::before{
                content: "请拖入组件";
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                left: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 14px;
                color: #C4C6CC;
                pointer-events: all;
            }
        }
    }
    .wrapper{
        & > [align-horizontal-left] {
            left: 0 !important;
        }
        & > [align-horizontal-center] {
            left: 50% !important;
            transform: translateX(-50%) !important;
        }
        & > [align-horizontal-right] {
            left: unset !important;
            right: 0 !important;
        }
        & > [align-vertical-top] {
            top: 0 !important;
        }
        & > [align-vertical-center] {
            top: 50% !important;
            transform: translateY(-50%) !important;
        }
        & > [align-vertical-bottom] {
            top: unset !important;
            bottom: 0 !important;
        }
        & > [align-horizontal-center][align-vertical-center]{
            transform: translate(-50%, -50%) !important;
        }
    }
    .drag-ghost {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: -1;
        background: #E9F1FD;
        & > * {
            display: none !important;
        }
    }
</style>
