<template>
    <div :class="$style['mobile-canvas-wrapper']">
        <edit-area></edit-area>
        <simulator v-show="showPreview" style="transform: translateX(-40px)" :key="previewKey"></simulator>
    </div>
</template>

<script>
    import editArea from './edit-area.vue'
    import simulator from './simulator-area.vue'
    import LC from '@/element-materials/core'
    import { uuid } from '@/common/util'
    
    export default {
        components: {
            editArea,
            simulator
        },
        data () {
            return {
                showPreview: true,
                previewKey: uuid()
            }
        },
        created () {
            LC.addEventListener('mobilePreviewSwitch', this.mobileSwitchCallback)
            LC.addEventListener('refreshPreview', this.updatePreview)
        },
        beforeDestroy () {
            LC.removeEventListener('mobilePreviewSwitch', this.mobileSwitchCallback)
            LC.removeEventListener('refreshPreview', this.updatePreview)
        },
        methods: {
            mobileSwitchCallback (val) {
                this.showPreview = val
            },
            updatePreview () {
                this.previewKey = uuid()
            }
        }
    }
</script>
<style lang="postcss" module>
.mobile-canvas-wrapper {
    display: flex;
    justify-content: space-around;
    min-width: 1000px;
    padding: 40px 0 80px;
    background: #fff;
    ::v-deep .lesscode-layout-empty {
        min-height: 0;
        min-width: 0;
        padding: 0;
        overflow: hidden;
    }
}
</style>
